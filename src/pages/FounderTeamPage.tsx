import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { 
  Users, UserPlus, ShieldCheck, TreePalm, 
  Map, Briefcase, Plus, MoreHorizontal, 
  Search, Filter, Github, Linkedin, Mail,
  ExternalLink, CircleCheck, CircleAlert,
  Users2, Workflow, Building2, Loader2,
  Heart, Shield, Sparkles, Pen, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FounderTeamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  // Fetch Team Members
  const { data: teamMembers = [], isPending: teamLoading } = useQuery({
    queryKey: ["team-members", startupId],
    queryFn: async () => {
      if (!startupId) return [];
      const { data } = await supabase.from("team_members").select("*").eq("startup_id", startupId);
      return data || [];
    },
    enabled: !!startupId,
  });

  // Fetch Hiring Roles
  const { data: hiringRoles = [], isPending: hiringLoading } = useQuery({
    queryKey: ["hiring-roles", startupId],
    queryFn: async () => {
      if (!startupId) return [];
      const { data } = await supabase.from("hiring_roles").select("*").eq("startup_id", startupId);
      return data || [];
    },
    enabled: !!startupId,
  });

  // Fetch Startup Data (for Culture Tags)
  const { data: startup } = useQuery({
    queryKey: ["startup-culture", startupId],
    queryFn: async () => {
      if (!startupId) return null;
      const { data, error } = await supabase.from("startups").select("*").eq("id", startupId).single();
      if (error) { console.warn("Startup query error:", error.message); return null; }
      return data;
    },
    enabled: !!startupId,
  });

  // Fetch Milestones (for Velocity)
  const { data: milestones = [] } = useQuery({
    queryKey: ["team-milestones", startupId],
    queryFn: async () => {
      if (!startupId) return [];
      const { data } = await supabase.from("milestones").select("*").eq("startup_id", startupId);
      return data || [];
    },
    enabled: !!startupId,
  });

  // Fetch Latest Pulse (for Burnout calculation)
  const { data: latestPulse } = useQuery({
    queryKey: ["latest-pulse-ops", startupId],
    queryFn: async () => {
      if (!startupId) return null;
      const { data } = await supabase.from("pulses").select("*").eq("startup_id", startupId).order("month", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!startupId,
  });

  // CALCULATED OPS DATA
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed' || m.status === 'Completed').length;
  const velocity = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const teamSize = teamMembers.length;
  const mrr = latestPulse?.mrr || 0;
  const mrrPerPerson = mrr / (teamSize || 1);
  
  let burnoutRisk = "Low";
  let burnoutValue = 15;
  if (mrrPerPerson > 10000 && teamSize < 5) {
    burnoutRisk = "High";
    burnoutValue = 85;
  } else if (mrrPerPerson > 5000 || (totalMilestones - completedMilestones) > 10) {
    burnoutRisk = "Medium";
    burnoutValue = 50;
  }

  // Mutations
  const addTeamMember = useMutation({
    mutationFn: async (newMember: any) => {
      const { error } = await supabase.from('team_members').insert({ ...newMember, startup_id: startupId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({ title: "Team member added!" });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const addHiringRole = useMutation({
    mutationFn: async (newRole: any) => {
      const { error } = await supabase.from('hiring_roles').insert({ ...newRole, startup_id: startupId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiring-roles"] });
      toast({ title: "Role added to roadmap!" });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const updateStartup = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from('startups').update(updates).eq('id', startupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["startup-culture"] });
      toast({ title: "Values updated!" });
    }
  });

  if (teamLoading || hiringLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-[#00D395]" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* 1. TEAM HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#00D395]">
            <Building2 className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Operations Hub</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1A1A1A] font-serif">Team & Leadership</h1>
          <p className="text-gray-500 max-w-2xl">
            Manage your core leadership bios, organizational structure, and <strong className="text-[#1A1A1A]">hiring roadmap</strong> for Lab transparency.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-[#1A1A1A] h-10 gap-2" onClick={() => toast({ title: "Org Chart coming soon." })}>
            <Workflow className="w-4 h-4" /> Org Chart
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#00D395] hover:bg-[#00A389] text-white h-10 gap-2">
                <Plus className="w-4 h-4" /> Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Add Core Leader</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border border-gray-200">
                    <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : ""} />
                    <AvatarFallback className="bg-gray-50 text-gray-400"><UserPlus className="w-6 h-6" /></AvatarFallback>
                  </Avatar>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Profile Picture</Label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      className="text-xs file:bg-[#00D395]/10 file:text-[#00D395] file:border-0 file:rounded-full file:px-4 file:py-1 file:mr-4 file:font-bold hover:file:bg-[#00D395]/20 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input id="new-member-name" placeholder="e.g. Sarah Chen" className="h-11 border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label>Role / Title</Label>
                  <Input id="new-member-role" placeholder="e.g. CTO & Co-Founder" className="h-11 border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input id="new-member-linkedin" placeholder="https://linkedin.com/in/..." className="h-11 border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label>Short Bio</Label>
                  <Textarea id="new-member-bio" placeholder="Brief background and current focus..." className="border-gray-100" />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={async () => {
                    const full_name = (document.getElementById('new-member-name') as HTMLInputElement).value;
                    const role = (document.getElementById('new-member-role') as HTMLInputElement).value;
                    const linkedin = (document.getElementById('new-member-linkedin') as HTMLInputElement).value;
                    const bio = (document.getElementById('new-member-bio') as HTMLTextAreaElement).value;
                    
                    if (!full_name || !role) {
                      toast({ title: "Name and Role are required", variant: "destructive" });
                      return;
                    }

                    setIsUploading(true);
                    let avatar_url = null;

                    try {
                      if (avatarFile) {
                        const fileExt = avatarFile.name.split('.').pop();
                        const fileName = `${Math.random()}.${fileExt}`;
                        
                        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, avatarFile);
                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
                        avatar_url = publicUrl;
                      }

                      addTeamMember.mutate({ full_name, role, linkedin, bio, avatar_url, is_founder: false });
                    } catch (error: any) {
                       toast({ title: "Avatar Upload Failed", description: error.message, variant: "destructive" });
                    } finally {
                       setIsUploading(false);
                       setAvatarFile(null);
                    }
                  }} 
                  className="bg-[#00D395] text-white rounded-full px-8"
                  disabled={addTeamMember.isPending || isUploading}
                >
                  {isUploading || addTeamMember.isPending ? "Adding..." : "Add Leader"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 2. CORE LEADERSHIP SECTION */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Core Leadership</h2>
          <Badge variant="outline" className="border-gray-200 text-gray-500 font-bold">{teamMembers.length} Members</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamMembers.length === 0 && (
            <div className="col-span-2 p-8 border border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 font-medium">
              No team members added yet. Click 'Add Team Member' to build your org chart.
            </div>
          )}
          {teamMembers.map((leader) => (
            <Card key={leader.id} className="bg-white border-gray-200 group hover:border-[#00D395]/30 transition-all overflow-hidden shadow-sm">
              <CardContent className="p-0">
                <div className="p-6 flex items-start gap-5">
                  <Avatar className="h-16 w-16 border-2 border-white ring-2 ring-[#00D395]/10 group-hover:ring-[#00D395]/30 transition-all">
                    {leader.avatar_url ? (
                      <AvatarImage src={leader.avatar_url} alt={leader.full_name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-[#00D395] to-[#878A22] text-white font-bold text-xl">
                        {leader.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#1A1A1A] group-hover:text-[#00D395] transition-colors">{leader.full_name}</h3>
                      <div className="flex gap-1">
                        {leader.linkedin && (
                          <a href={leader.linkedin} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-[#00D395]">
                              <Linkedin className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-bold text-[#878A22] uppercase tracking-widest mt-1">{leader.role}</p>
                    <p className="text-sm text-gray-600 mt-4 leading-relaxed line-clamp-2 italic">
                      "{leader.bio || "No bio added yet."}"
                    </p>
                  </div>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                   <Button variant="ghost" className="text-[10px] text-gray-500 hover:text-[#00D395] p-0 h-auto gap-1 uppercase tracking-widest font-bold">
                      Edit Profile <ExternalLink className="w-3 h-3" />
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        
        {/* 3. HIRING ROADMAP (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Hiring Roadmap</h2>
              <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-[#1A1A1A] font-bold">Full Pipeline</Button>
           </div>
           
           <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                 <div className="divide-y divide-gray-100">
                    {hiringRoles.length === 0 && (
                      <div className="p-8 text-center text-gray-400 font-medium text-sm">
                        No open roles. Define a new role to start hiring.
                      </div>
                    )}
                    {hiringRoles.map((job) => (
                      <div key={job.id} className="p-5 flex items-center justify-between group hover:bg-[#F9F6F2] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            job.priority === 'High' ? 'bg-[#FF4D4F]/10 text-[#FF4D4F]' : 
                            job.priority === 'Medium' ? 'bg-[#F5A623]/10 text-[#F5A623]' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1A1A1A] leading-none">{job.role_title}</h4>
                            <p className="text-[11px] text-gray-500 mt-1.5 uppercase tracking-wider font-semibold">{job.department || 'General'} • {job.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-tighter ${
                             job.priority === 'High' ? 'border-[#FF4D4F]/30 text-[#FF4D4F] bg-[#FF4D4F]/5' : 'border-gray-200 text-gray-500'
                           }`}>
                             {job.priority} Priority
                           </Badge>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#00D395]">
                              <MoreHorizontal className="w-4 h-4" />
                           </Button>
                        </div>
                      </div>
                    ))}
                 </div>
                 <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full border-dashed border-gray-300 text-gray-500 hover:text-[#00D395] hover:border-[#00D395] transition-all py-6 font-bold">
                           <Plus className="w-4 h-4 mr-2" /> Define New Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle>Add Hiring Role</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Role Title</Label>
                            <Input id="new-role-title" placeholder="e.g. Senior Product Designer" className="h-11 border-gray-100" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Department</Label>
                              <Input id="new-role-dept" placeholder="e.g. Product" className="h-11 border-gray-100" />
                            </div>
                            <div className="space-y-2">
                              <Label>Priority</Label>
                              <Select onValueChange={(v) => (window as any)._newRolePriority = v}>
                                <SelectTrigger className="h-11 border-gray-100">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="High">High</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                              <Label>Status</Label>
                              <Select onValueChange={(v) => (window as any)._newRoleStatus = v}>
                                <SelectTrigger className="h-11 border-gray-100">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Planned">Planned</SelectItem>
                                  <SelectItem value="Sourcing">Sourcing</SelectItem>
                                  <SelectItem value="Interviewing">Interviewing</SelectItem>
                                  <SelectItem value="Offered">Offered</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={() => {
                              const role_title = (document.getElementById('new-role-title') as HTMLInputElement).value;
                              const department = (document.getElementById('new-role-dept') as HTMLInputElement).value;
                              const priority = (window as any)._newRolePriority || 'Medium';
                              const status = (window as any)._newRoleStatus || 'Planned';
                              
                              if (role_title) {
                                addHiringRole.mutate({ role_title, department, priority, status });
                              } else {
                                toast({ title: "Role Title is required", variant: "destructive" });
                              }
                            }} 
                            className="bg-[#00D395] text-white rounded-full px-8"
                            disabled={addHiringRole.isPending}
                          >
                            {addHiringRole.isPending ? "Adding..." : "Add to Roadmap"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* 4. TEAM PULSE & OPS (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
           <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Operational Health</h2>
           
           {/* Team Capacity Insight */}
            <Card className="bg-white border-[#00D395]/20 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                  <ShieldCheck className="w-10 h-10 text-[#00D395] opacity-5" />
               </div>
               <CardContent className="p-6 space-y-6">
                  <div>
                     <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest mb-4">Team Capacity</h4>
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <div className="flex justify-between text-xs">
                              <span className="text-gray-500 font-semibold">Delivery Velocity</span>
                              <span className="text-[#00D395] font-bold">{velocity}%</span>
                           </div>
                           <Progress value={velocity} className="h-1.5 bg-gray-100 [&>div]:bg-[#00D395]" />
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-xs">
                              <span className="text-gray-500 font-semibold">Burnout Risk Cohort</span>
                              <span className={`font-bold ${burnoutRisk === 'High' ? 'text-[#FF4D4F]' : burnoutRisk === 'Medium' ? 'text-[#F5A623]' : 'text-[#00D395]'}`}>
                                {burnoutRisk}
                              </span>
                           </div>
                           <Progress value={burnoutValue} className={`h-1.5 bg-gray-100 ${burnoutRisk === 'High' ? '[&>div]:bg-[#FF4D4F]' : burnoutRisk === 'Medium' ? '[&>div]:bg-[#F5A623]' : '[&>div]:bg-[#00D395]'}`} />
                        </div>
                     </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#878A22]/5 border border-[#878A22]/20">
                     <div className="flex items-center gap-2 text-[#878A22] mb-1">
                        <CircleAlert className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Lab Note</span>
                     </div>
                     <p className="text-xs text-gray-600 font-medium leading-snug">
                        {burnoutRisk === 'High' 
                          ? "Critical Alert: Growth is outpacing hiring. Immediate recruitment for Ops or Leadership is required to prevent churn."
                          : teamSize === 1 
                          ? "Solopreneur Alert: You are handling 100% of the load. Consider a Virtual Assistant or part-time hire."
                          : "Team balance looks healthy for current MRR levels."}
                     </p>
                  </div>
               </CardContent>
            </Card>

            {/* Talent Brand & Values */}
            <div className="p-6 rounded-2xl bg-white shadow-sm border border-gray-100 space-y-4 group">
               <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Talent Brand & Values</h4>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pen className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white">
                      <DialogHeader>
                        <DialogTitle>Edit Brand Values</DialogTitle>
                        <DialogDescription>Add tags that describe your workplace culture for investors and hires.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Input id="new-tag" placeholder="e.g. Remote First" className="h-10 border-gray-200" />
                          <Button onClick={() => {
                            const val = (document.getElementById('new-tag') as HTMLInputElement).value;
                            if (val) {
                              const newTags = [...(startup?.culture_tags || []), val];
                              updateStartup.mutate({ culture_tags: newTags });
                              (document.getElementById('new-tag') as HTMLInputElement).value = '';
                            }
                          }} className="bg-[#00D395] text-white">Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {(startup?.culture_tags || []).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-600 font-bold gap-1 pr-1 py-1">
                              {tag}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 hover:text-[#FF4D4F] p-0" 
                                onClick={() => {
                                  const newTags = (startup?.culture_tags || []).filter((_: any, idx: number) => idx !== i);
                                  updateStartup.mutate({ culture_tags: newTags });
                                }}
                              >
                                <X className="w-2 h-2" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
               </div>
               <div className="flex flex-wrap gap-2">
                  {(startup?.culture_tags || []).length === 0 && (
                    <span className="text-[10px] text-gray-400 font-medium italic">No values defined yet.</span>
                  )}
                  {(startup?.culture_tags || []).map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="border-gray-200 bg-gray-50 text-gray-600 font-bold">
                      {tag}
                    </Badge>
                  ))}
               </div>
            </div>
        </div>

      </div>
    </div>
  );
}
