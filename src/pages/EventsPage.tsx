import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon, MapPin, Users, Plus, Loader2, Trash2,
  Clock, Upload, ImagePlus, X, ArrowRight, Tag, Pencil, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";

const EVENT_BUCKET = "event-covers";

// Pastel badge colors that auto-rotate based on event type string
const typeColors = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
];

function getTypeColor(eventType: string | null) {
  if (!eventType) return typeColors[0];
  let hash = 0;
  for (let i = 0; i < eventType.length; i++) hash = eventType.charCodeAt(i) + ((hash << 5) - hash);
  return typeColors[Math.abs(hash) % typeColors.length];
}

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Tables<"events"> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", description: "", location: "", event_date: "", event_type: "" });
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    location: "",
    event_date: "",
    event_type: "",
  });

  // --- Queries ---
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ["event_attendees", selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      const { data, error } = await supabase
        .from("event_attendees")
        .select("*, startups(name, logo_url)")
        .eq("event_id", selectedEvent.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEvent?.id,
  });

  // --- Mutations ---
  const createEvent = useMutation({
    mutationFn: async () => {
      let coverUrl: string | null = null;

      // Upload cover image if selected
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(EVENT_BUCKET).upload(fileName, coverFile);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from(EVENT_BUCKET).getPublicUrl(fileName);
        coverUrl = publicData.publicUrl;
      }

      const { error } = await supabase.from("events").insert({
        title: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        event_date: new Date(newEvent.event_date).toISOString(),
        event_type: newEvent.event_type || "General",
        cover_image_url: coverUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["overview-events"] });
      setIsCreateOpen(false);
      setNewEvent({ title: "", description: "", location: "", event_date: "", event_type: "" });
      setCoverFile(null);
      setCoverPreview(null);
      toast({ title: "Event created successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating event", description: error.message, variant: "destructive" });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) return;
      let coverUrl = selectedEvent.cover_image_url;

      if (editCoverFile) {
        const ext = editCoverFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(EVENT_BUCKET).upload(fileName, editCoverFile);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from(EVENT_BUCKET).getPublicUrl(fileName);
        coverUrl = publicData.publicUrl;
      }

      const { error } = await supabase.from("events").update({
        title: editData.title,
        description: editData.description,
        location: editData.location,
        event_date: new Date(editData.event_date).toISOString(),
        event_type: editData.event_type || "General",
        cover_image_url: coverUrl,
      }).eq("id", selectedEvent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["overview-events"] });
      setIsEditing(false);
      setSelectedEvent(null);
      setEditCoverFile(null);
      setEditCoverPreview(null);
      toast({ title: "Event updated successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating event", description: error.message, variant: "destructive" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["overview-events"] });
      setSelectedEvent(null);
      toast({ title: "Event removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting event", description: error.message, variant: "destructive" });
    },
  });

  // --- Helpers ---
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleEditCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditCoverFile(file);
    setEditCoverPreview(URL.createObjectURL(file));
  };

  const startEditing = () => {
    if (!selectedEvent) return;
    const d = new Date(selectedEvent.event_date);
    const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditData({
      title: selectedEvent.title,
      description: selectedEvent.description || "",
      location: selectedEvent.location || "",
      event_date: localDate,
      event_type: selectedEvent.event_type || "",
    });
    setEditCoverPreview(selectedEvent.cover_image_url || null);
    setEditCoverFile(null);
    setIsEditing(true);
  };

  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.event_date) < new Date());
  const featuredEvent = upcomingEvents[0] || null;
  const remainingUpcoming = upcomingEvents.slice(1);

  // --- Render ---
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight font-heading">Event Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Create events, track attendance, and engage your portfolio.</p>
        </div>

        {/* Create Event Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Cover Image Upload */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverSelect}
                />
                {coverPreview ? (
                  <div className="relative rounded-lg overflow-hidden h-40">
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm font-medium">Click to upload a cover photo</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Title</Label>
                  <Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="e.g. Q3 Demo Day" />
                </div>
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Input value={newEvent.event_type} onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })} placeholder="e.g. Demo Day, Workshop" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="Main Hall or Zoom Link" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Describe the event agenda, speakers, and what attendees should expect..."
                  rows={4}
                />
              </div>

              <Button className="w-full" onClick={() => createEvent.mutate()} disabled={createEvent.isPending || !newEvent.title || !newEvent.event_date}>
                {createEvent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="p-16 border border-dashed rounded-xl bg-muted/5 flex flex-col items-center justify-center text-center">
          <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-foreground">No events yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create your first event to start engaging your portfolio founders.</p>
        </div>
      ) : (
        <>
          {/* Featured Event Banner */}
          {featuredEvent && (
            <div
              className="relative rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => setSelectedEvent(featuredEvent)}
            >
              {/* Background */}
              <div className="h-[280px] w-full">
                {featuredEvent.cover_image_url ? (
                  <img src={featuredEvent.cover_image_url} alt={featuredEvent.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/80 via-primary/60 to-accent/50" />
                )}
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="outline" className="bg-white/15 text-white border-white/20 backdrop-blur-sm text-xs font-semibold">
                    {featuredEvent.event_type || "Event"}
                  </Badge>
                  <span className="text-white/70 text-sm font-medium">UPCOMING</span>
                </div>
                <h2 className="text-3xl font-bold text-white font-heading">{featuredEvent.title}</h2>
                <div className="flex items-center gap-6 mt-3 text-white/80 text-sm">
                  <span className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5" /> {new Date(featuredEvent.event_date).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> {new Date(featuredEvent.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {featuredEvent.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {featuredEvent.location}</span>}
                </div>
                <Button variant="secondary" size="sm" className="mt-5 group-hover:bg-white group-hover:text-black transition-colors">
                  View Details <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Upcoming Events Grid */}
          {remainingUpcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold font-heading mb-4">Upcoming Events</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingUpcoming.map((event) => (
                  <Card
                    key={event.id}
                    className="overflow-hidden cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="h-36 w-full overflow-hidden">
                      {event.cover_image_url ? (
                        <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center">
                          <CalendarIcon className="h-10 w-10 text-primary/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${getTypeColor(event.event_type)}`}>
                          {event.event_type || "Event"}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{event.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {new Date(event.event_date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}</span>
                        {event.location && <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {event.location}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold font-heading mb-4 text-muted-foreground">Past Events</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="overflow-hidden cursor-pointer group opacity-60 hover:opacity-90 transition-all duration-300 border"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="h-36 w-full overflow-hidden relative">
                      {event.cover_image_url ? (
                        <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover grayscale" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <CalendarIcon className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}
                      <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-black/50 text-white backdrop-blur-sm">Past</span>
                    </div>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{event.title}</h3>
                        <span className="text-xs text-muted-foreground">{new Date(event.event_date).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent.mutate(event.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) { setSelectedEvent(null); setIsEditing(false); } }}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          {selectedEvent && !isEditing && (
            <>
              {/* Cover Image */}
              <div className="h-52 w-full relative">
                {selectedEvent.cover_image_url ? (
                  <img src={selectedEvent.cover_image_url} alt={selectedEvent.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/60 via-primary/40 to-accent/30" />
                )}
                {/* Edit Button overlaid on cover */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white text-foreground shadow-sm gap-1.5"
                  onClick={startEditing}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className={`text-xs font-semibold ${getTypeColor(selectedEvent.event_type)}`}>
                      <Tag className="h-3 w-3 mr-1" />
                      {selectedEvent.event_type || "Event"}
                    </Badge>
                    {new Date(selectedEvent.event_date) < new Date() && (
                      <Badge variant="secondary" className="text-xs">Past Event</Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold font-heading">{selectedEvent.title}</h2>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5 text-primary" /> {new Date(selectedEvent.event_date).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-primary" /> {new Date(selectedEvent.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {selectedEvent.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-primary" /> {selectedEvent.location}</span>}
                  </div>
                </div>

                {/* Description */}
                {selectedEvent.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">About This Event</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}

                {/* Attendees */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                    <Users className="h-4 w-4 mr-1.5 text-primary" />
                    Attendees ({attendees.length})
                  </h3>
                  {attendees.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No startups have registered yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {attendees.map((attendee: any) => (
                        <div key={attendee.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                                {attendee.startups?.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{attendee.startups?.name}</span>
                          </div>
                          <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {attendee.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete Past Event */}
                {new Date(selectedEvent.event_date) < new Date() && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 w-full"
                      onClick={() => deleteEvent.mutate(selectedEvent.id)}
                      disabled={deleteEvent.isPending}
                    >
                      {deleteEvent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Remove Past Event
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Edit Mode */}
          {selectedEvent && isEditing && (
            <div className="p-6 space-y-4">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
              </DialogHeader>

              {/* Cover Image Re-upload */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditCoverSelect} />
                {editCoverPreview ? (
                  <div className="relative rounded-lg overflow-hidden h-40">
                    <img src={editCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setEditCoverFile(null); setEditCoverPreview(null); }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full px-3 py-1 text-xs hover:bg-black/80 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-sm">Upload cover photo</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Title</Label>
                  <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Input value={editData.event_type} onChange={(e) => setEditData({ ...editData, event_type: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" value={editData.event_date} onChange={(e) => setEditData({ ...editData, event_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={4} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => updateEvent.mutate()} disabled={updateEvent.isPending || !editData.title || !editData.event_date}>
                  {updateEvent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
