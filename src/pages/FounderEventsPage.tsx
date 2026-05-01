import { useState } from "react";
import { 
  Calendar, MapPin, Video, Plus, ExternalLink, 
  Users, Award, Clock, Check, X, AlertCircle, 
  ChevronRight, MoreHorizontal, Globe, CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, isAfter, parseISO } from "date-fns";

export default function FounderEventsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get Startup ID
  const { data: startupId } = useQuery({
    queryKey: ["founder-startup-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("startup_id").eq("id", user.id).single();
      return data?.startup_id;
    },
    enabled: !!user,
  });

  const [declineReason, setDeclineReason] = useState("");
  const [activeEventToDecline, setActiveEventToDecline] = useState<string | null>(null);
  
  // External Engagement Form State
  const [isLogEngagementOpen, setIsLogEngagementOpen] = useState(false);
  const [newEngagement, setNewEngagement] = useState({
    title: "",
    date: "",
    location: "",
    goal: ""
  });

  // --- QUERIES ---

  // 1. Fetch Global Events (Upcoming Only)
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["founder-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
        
      if (error) throw error;
      
      // Filter for upcoming only based on our new rule
      const now = new Date();
      return (data || []).filter(e => isAfter(parseISO(e.event_date), now));
    }
  });

  // 2. Fetch User's RSVPs
  const { data: userRSVPs = [] } = useQuery({
    queryKey: ["founder-rsvps", startupId],
    queryFn: async () => {
      if (!startupId) return [];
      const { data, error } = await supabase
        .from("event_attendees")
        .select("*")
        .eq("startup_id", startupId);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!startupId
  });

  // 3. Fetch External Engagements
  const { data: externalEngagements = [] } = useQuery({
    queryKey: ["founder-engagements", startupId],
    queryFn: async () => {
      if (!startupId) return [];
      const { data, error } = await supabase
        .from("external_engagements")
        .select("*")
        .eq("startup_id", startupId)
        .order("start_date", { ascending: true });
        
      if (error) throw error;
      // Also filter to upcoming
      const now = new Date();
      return (data || []).filter(e => isAfter(parseISO(e.start_date), now));
    },
    enabled: !!startupId
  });

  // --- MUTATIONS ---

  // RSVP Mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status, notes }: { eventId: string, status: string, notes?: string }) => {
      if (!startupId) throw new Error("No startup ID");
      
      // Upsert the RSVP
      const { error } = await supabase
        .from("event_attendees")
        .upsert({
          event_id: eventId,
          startup_id: startupId,
          status: status,
          notes: notes
        }, { onConflict: 'event_id, startup_id' });
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-rsvps"] });
      setActiveEventToDecline(null);
      setDeclineReason("");
      toast({ title: "RSVP updated!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update RSVP", description: error.message, variant: "destructive" });
    }
  });

  // Log Engagement Mutation
  const logEngagementMutation = useMutation({
    mutationFn: async () => {
      if (!startupId) throw new Error("No startup ID");
      
      const { error } = await supabase
        .from("external_engagements")
        .insert({
          startup_id: startupId,
          title: newEngagement.title,
          location: newEngagement.location,
          start_date: new Date(newEngagement.date).toISOString(),
          goal: newEngagement.goal,
          status: 'Confirmed'
        });
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-engagements"] });
      setIsLogEngagementOpen(false);
      setNewEngagement({ title: "", date: "", location: "", goal: "" });
      toast({ title: "External engagement logged!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to log engagement", description: error.message, variant: "destructive" });
    }
  });

  const getEventStatus = (eventId: string) => {
    const rsvp = userRSVPs.find(r => r.event_id === eventId);
    return rsvp ? rsvp.status : "Pending";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* 1. HERO SECTION: IMA-ABASI'S COPY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1A1A1A] font-serif">Events & Community</h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-3xl font-medium">
            Stay connected with everything happening in the <strong className="text-[#1A1A1A]">Collective Lab</strong>. 
            Browse upcoming sessions designed to help you learn, connect, and move faster.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Dialog open={isLogEngagementOpen} onOpenChange={setIsLogEngagementOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00D395] hover:bg-[#00A389] text-white gap-2 h-11 px-6 shadow-sm font-bold rounded-full">
                <Plus className="w-4 h-4" /> Log External Engagement
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-[#1A1A1A] rounded-2xl shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Log External Engagement</DialogTitle>
                <DialogDescription className="text-gray-500 font-medium">
                  Attending a conference or external pitch day? Log it here so the Lab knows where you are and how they can support you.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="event-name" className="text-gray-700 font-bold">Event Name</Label>
                  <Input 
                    id="event-name" 
                    placeholder="e.g. TechCrunch Disrupt" 
                    className="bg-white border-gray-200 text-[#1A1A1A]" 
                    value={newEngagement.title}
                    onChange={(e) => setNewEngagement({...newEngagement, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-gray-700 font-bold">Date</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      className="bg-white border-gray-200 text-[#1A1A1A]" 
                      value={newEngagement.date}
                      onChange={(e) => setNewEngagement({...newEngagement, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-gray-700 font-bold">Location</Label>
                    <Input 
                      id="location" 
                      placeholder="City or Online" 
                      className="bg-white border-gray-200 text-[#1A1A1A]" 
                      value={newEngagement.location}
                      onChange={(e) => setNewEngagement({...newEngagement, location: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal" className="text-gray-700 font-bold">Primary Goal</Label>
                  <Textarea 
                    id="goal" 
                    placeholder="e.g. Raising Seed round / Hiring" 
                    className="bg-white border-gray-200 text-[#1A1A1A]" 
                    value={newEngagement.goal}
                    onChange={(e) => setNewEngagement({...newEngagement, goal: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" className="text-gray-500 hover:text-[#1A1A1A] font-bold" onClick={() => setIsLogEngagementOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-[#00D395] hover:bg-[#00A389] text-white font-bold" 
                  onClick={() => logEngagementMutation.mutate()}
                  disabled={logEngagementMutation.isPending || !newEngagement.title || !newEngagement.date}
                >
                  {logEngagementMutation.isPending ? "Logging..." : "Log Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 2. LEFT: LAB EVENTS (THE MAIN FEED) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#00D395]" /> Upcoming Lab Sessions
            </h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#1A1A1A] cursor-pointer font-bold">Official</Badge>
              <Badge variant="outline" className="border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#1A1A1A] cursor-pointer font-bold">Community</Badge>
            </div>
          </div>

          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="p-8 border border-dashed rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
                <CalendarDays className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">No upcoming lab sessions.</p>
              </div>
            ) : upcomingEvents.map((event: any) => {
              const eventDateObj = parseISO(event.event_date);
              const status = getEventStatus(event.id);
              return (
              <Card key={event.id} className="bg-white border-gray-200 overflow-hidden group hover:border-[#00D395]/40 hover:shadow-md transition-all rounded-2xl">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-48 bg-gray-50/50 border-r border-gray-100 p-6 flex flex-col items-center justify-center text-center space-y-1 group-hover:bg-[#00D395]/5 transition-colors">
                    <span className="text-xs uppercase tracking-widest font-bold text-gray-500">{format(eventDateObj, "EEEE")}</span>
                    <span className="text-3xl font-bold text-[#1A1A1A] tracking-tighter">{format(eventDateObj, "dd")}</span>
                    <span className="text-xs font-bold text-[#00D395]">{format(eventDateObj, "h:mm a")}</span>
                  </div>
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-[#1A1A1A] group-hover:text-[#00D395] transition-colors">{event.title}</h3>
                          {status === 'Attending' && <Badge className="bg-[#00D395]/10 text-[#00D395] border-none font-bold"><Check className="w-3 h-3 mr-1" /> Attending</Badge>}
                          {status === 'Declined' && <Badge className="bg-[#FF4D4F]/10 text-[#FF4D4F] border-none font-bold"><X className="w-3 h-3 mr-1" /> Declined</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                          <span className="flex items-center gap-1.5">
                            {event.location?.toLowerCase().includes('zoom') || event.location?.toLowerCase().includes('online') ? <Video className="w-4 h-4 text-[#00D395]" /> : <MapPin className="w-4 h-4 text-[#878A22]" />}
                            {event.location}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs bg-gray-100 px-2 rounded-full text-gray-600">
                            {event.event_type || 'Event'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-3 pt-2">
                      {status === "Pending" ? (
                        <>
                          <Button 
                            className="bg-[#00D395] hover:bg-[#00A389] text-white px-6 h-9 font-bold rounded-full shadow-sm"
                            onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "Attending" })}
                            disabled={rsvpMutation.isPending}
                          >
                            Attend Session
                          </Button>
                          
                          <Dialog open={activeEventToDecline === event.id} onOpenChange={(open) => !open && setActiveEventToDecline(null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#FF4D4F] h-9 font-bold rounded-full" onClick={() => setActiveEventToDecline(event.id)}>
                                Decline
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white border-gray-200 text-[#1A1A1A] rounded-2xl shadow-xl">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Can't make it?</DialogTitle>
                                <DialogDescription className="text-gray-500 font-medium">
                                  We miss you! Lab sessions are built to help you scale. Please let us know why you can't attend so we can keep our records updated.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label className="font-bold text-gray-700">Reason for Absence</Label>
                                  <Tabs defaultValue="meeting" onValueChange={setDeclineReason}>
                                    <TabsList className="bg-gray-100 border border-gray-200 w-full rounded-lg">
                                      <TabsTrigger value="meeting" className="flex-1 text-[10px] font-bold">Customer Meeting</TabsTrigger>
                                      <TabsTrigger value="sick" className="flex-1 text-[10px] font-bold">Illness</TabsTrigger>
                                      <TabsTrigger value="travel" className="flex-1 text-[10px] font-bold">Travel</TabsTrigger>
                                      <TabsTrigger value="other" className="flex-1 text-[10px] font-bold">Other</TabsTrigger>
                                    </TabsList>
                                  </Tabs>
                                </div>
                                <Textarea 
                                  placeholder="Provide a quick detail..." 
                                  className="bg-white border-gray-200 min-h-[80px] text-[#1A1A1A]"
                                  value={declineReason}
                                  onChange={(e) => setDeclineReason(e.target.value)}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="ghost" className="text-gray-500 hover:text-[#1A1A1A] font-bold" onClick={() => setActiveEventToDecline(null)}>Back</Button>
                                <Button 
                                  className="bg-[#FF4D4F] hover:bg-[#E04344] text-white font-bold" 
                                  onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "Declined", notes: declineReason })}
                                  disabled={rsvpMutation.isPending}
                                >
                                  {rsvpMutation.isPending ? "Updating..." : "Confirm Absence"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      ) : (
                        <Button variant="outline" className="border-gray-200 text-gray-500 h-9 font-bold rounded-full hover:bg-gray-50" onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "Pending" })}>
                          Change RSVP
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )})}
          </div>
        </div>

        {/* 3. RIGHT: FOUNDER ENGAGEMENTS (EXTERNAL) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#878A22]" /> External Schedule
            </h2>
          </div>

          <div className="space-y-4">
            {externalEngagements.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-gray-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#1A1A1A]">No external events</p>
                  <p className="text-xs text-gray-500 max-w-[200px] font-medium">Log your upcoming networking activities here.</p>
                </div>
              </div>
            ) : externalEngagements.map((eng: any) => (
              <Card key={eng.id} className="bg-white border-gray-200 relative overflow-hidden shadow-sm rounded-2xl">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#878A22]"></div>
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-[#1A1A1A]">{eng.title}</h4>
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {eng.location}
                      </p>
                    </div>
                    <Badge className="bg-[#878A22]/10 text-[#878A22] border-none text-[10px] font-bold">{eng.status}</Badge>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#878A22]" />
                      <span className="text-[11px] font-bold text-gray-600">{format(parseISO(eng.start_date), "MMM dd, yyyy")}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Strategic Goal</span>
                    <p className="text-[12px] text-gray-700 italic font-medium">"{eng.goal}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="p-6 rounded-2xl border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-gray-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1A1A1A]">Traveling for business?</p>
                <p className="text-xs text-gray-500 max-w-[200px] font-medium">Keep the Lab updated on your external moves.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. SYSTEM NOTE */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00D395]/5 border border-[#00D395]/10 max-w-2xl mx-auto shadow-sm">
        <AlertCircle className="w-5 h-5 text-[#00D395] shrink-0" />
        <p className="text-xs text-gray-600 leading-relaxed font-medium">
          <strong className="text-[#1A1A1A]">Attendance Policy:</strong> Official Lab sessions are built to accelerate your growth. 
          Founders are expected to attend 80% of official sessions to remain in good standing.
        </p>
      </div>

    </div>
  );
}
