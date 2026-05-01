import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Edit3, Share2, Globe, Rocket, Target, Users, Sparkles, 
  TrendingUp, Briefcase, ChevronRight, CheckCircle2, 
  Plus, ArrowUpRight, Shield, Loader2, Phone, MapPin,
  Instagram, Linkedin, Twitter, ExternalLink, Building2, User,
  Flag, Printer
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+1", name: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", name: "UK", flag: "🇬🇧" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
];

export default function FounderProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPublic, setIsPublic] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+234");

  // 1. FETCH DATA
  const { data: startup, isLoading: startupLoading } = useQuery({
    queryKey: ["founder-startup", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: profile } = await supabase.from("profiles").select("startup_id").eq("id", user.id).single();
      if (!profile?.startup_id) return null;
      const { data } = await supabase.from("startups").select("*").eq("id", profile.startup_id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["founder-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // 2. MUTATIONS
  const updateStartup = useMutation({
    mutationFn: async (updates: any) => {
      if (!startup?.id) return;
      const { error } = await supabase.from("startups").update(updates).eq("id", startup.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-startup"] });
      toast({ title: "Updated!", description: "Company profile has been synced." });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: any) => {
      if (!user?.id) return;
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-profile"] });
      toast({ title: "Updated!", description: "Your personal identity has been synced." });
    },
  });

  // Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0 || !startup?.id) return;
      const file = e.target.files[0];
      const fileName = `${startup.id}/${Math.random()}.png`;
      
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
      updateStartup.mutate({ logo_url: publicUrl });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  };

  if (startupLoading || profileLoading) return <div className="flex h-screen items-center justify-center bg-[#F9F6F2]"><Loader2 className="animate-spin text-[#00D395]" /></div>;
  const completionScore = 85; 


  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight font-serif text-[#1A1A1A] print:hidden">Company Profile</h1>
          <p className="text-gray-500 mt-1 font-medium print:hidden">Your official investor fact sheet and public narrative.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-full border border-gray-200 shadow-sm print:hidden">
          <Button onClick={() => window.print()} variant="outline" size="sm" className="h-8 gap-2 border-gray-200 text-gray-600 hover:text-[#1A1A1A] rounded-full">
            <Printer className="w-3.5 h-3.5" /> Fact Sheet
          </Button>
          <div className="w-px h-6 bg-gray-200"></div>
          <Badge variant="outline" className={`border-none font-bold uppercase tracking-widest ${isPublic ? 'bg-[#00D395]/10 text-[#00D395]' : 'bg-gray-100 text-gray-500'}`}>
            {isPublic ? 'Live' : 'Private'}
          </Badge>
          <div className="flex items-center space-x-2">
            <Switch id="public-mode" checked={isPublic} onCheckedChange={setIsPublic} className="data-[state=checked]:bg-[#00D395]" />
            <Label htmlFor="public-mode" className="text-xs font-bold text-gray-600 cursor-pointer uppercase tracking-widest">Public Link</Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Content */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* HERO IDENTITY CARD */}
          <Card className="bg-white border-gray-200 shadow-sm overflow-hidden relative group rounded-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00D395] to-[#878A22]"></div>
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20 group/logo">
                    <div className="w-full h-full rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-4xl shadow-sm overflow-hidden">
                      {startup?.logo_url ? <img src={startup.logo_url} className="w-full h-full object-contain" /> : <Building2 className="text-gray-300" />}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-2xl opacity-0 group-hover/logo:opacity-100 cursor-pointer transition-opacity">
                      <Plus className="w-6 h-6" />
                      <input type="file" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">{startup?.name || "No Name Set"}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className="bg-[#00D395]/10 text-[#00D395] border-none font-bold uppercase tracking-widest">{startup?.sector || "No Sector"}</Badge>
                      <Badge className="bg-gray-50 text-gray-600 border-gray-200 font-bold uppercase tracking-widest">{startup?.current_stage || "Early"}</Badge>
                    </div>
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#00D395] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Edit Company Identity</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input defaultValue={startup?.name} id="edit-name" className="h-11 border-gray-100" />
                      </div>
                      <div className="space-y-2">
                        <Label>Sector</Label>
                        <Input defaultValue={startup?.sector} id="edit-sector" className="h-11 border-gray-100" />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input defaultValue={startup?.website} id="edit-website" className="h-11 border-gray-100" />
                      </div>
                      <div className="space-y-2">
                        <Label>Elevator Pitch</Label>
                        <Textarea defaultValue={startup?.description} id="edit-description" className="min-h-[100px] border-gray-100" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => {
                        const name = (document.getElementById('edit-name') as HTMLInputElement).value;
                        const sector = (document.getElementById('edit-sector') as HTMLInputElement).value;
                        const website = (document.getElementById('edit-website') as HTMLInputElement).value;
                        const description = (document.getElementById('edit-description') as HTMLTextAreaElement).value;
                        updateStartup.mutate({ name, sector, website, description });
                      }} className="bg-[#00D395] text-white rounded-full px-8">Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="mt-8 p-4 rounded-xl bg-[#F9F6F2] border border-gray-200">
                <p className="text-lg text-gray-700 font-medium leading-relaxed italic">
                  "{startup?.description || "Your company elevator pitch goes here. Add it in settings!"}"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PERSONAL IDENTITY (THE FOUNDER) */}
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center">
                <User className="w-4 h-4 mr-2 text-[#00D395]" /> Founder Profile
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#00D395] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Edit Personal Identity</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input defaultValue={profile?.full_name} id="edit-founder-name" className="h-11 border-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="flex gap-2">
                        <Select defaultValue={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                          <SelectTrigger className="w-[110px] border-gray-100 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {COUNTRY_CODES.map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input defaultValue={profile?.phone_number?.split(' ').pop()} id="edit-phone" className="h-11 border-gray-100 flex-1" placeholder="810 000 0000" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input defaultValue={profile?.country} id="edit-country" className="h-11 border-gray-100" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                      const full_name = (document.getElementById('edit-founder-name') as HTMLInputElement).value;
                      const phone_val = (document.getElementById('edit-phone') as HTMLInputElement).value;
                      const phone_number = `${selectedCountryCode} ${phone_val}`;
                      const country = (document.getElementById('edit-country') as HTMLInputElement).value;
                      updateProfile.mutate({ full_name, phone_number, country });
                    }} className="bg-[#00D395] text-white rounded-full px-8">Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-gray-100">
                    <AvatarFallback className="bg-gray-50 text-[#00D395] font-bold">{profile?.full_name?.charAt(0) || "F"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">{profile?.full_name || "Founder Name"}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Founder & CEO</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-[#00D395]"><Phone className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Phone</p>
                    <p className="text-sm font-bold text-[#1A1A1A]">{profile?.phone_number || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-[#00D395]"><MapPin className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Country</p>
                    <p className="text-sm font-bold text-[#1A1A1A]">{profile?.country || "Not set"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STRATEGIC NARRATIVE (Stubbed for now, can be expanded) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-gray-200 shadow-sm rounded-2xl relative group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-500 flex items-center uppercase tracking-wider">
                  <Target className="w-4 h-4 mr-2 text-[#FF4D4F]" /> Strategic Focus
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#00D395] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Edit Strategic Focus</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <Textarea 
                        defaultValue={startup?.problem_statement} 
                        id="edit-problem" 
                        className="min-h-[120px] border-gray-100" 
                        placeholder="What is the primary mission or problem your business focuses on?"
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={() => {
                        const problem_statement = (document.getElementById('edit-problem') as HTMLTextAreaElement).value;
                        updateStartup.mutate({ problem_statement });
                      }} className="bg-[#00D395] text-white rounded-full px-8">Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <p className="text-[14px] text-gray-600 font-medium leading-relaxed">{startup?.problem_statement || "What problem are you solving? Add your statement here."}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm rounded-2xl relative group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-500 flex items-center uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 mr-2 text-[#00D395]" /> Value Proposition
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#00D395] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Edit Value Proposition</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <Textarea 
                        defaultValue={startup?.solution_description} 
                        id="edit-solution" 
                        className="min-h-[120px] border-gray-100" 
                        placeholder="What unique value do you provide to your customers?"
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={() => {
                        const solution_description = (document.getElementById('edit-solution') as HTMLTextAreaElement).value;
                        updateStartup.mutate({ solution_description });
                      }} className="bg-[#00D395] text-white rounded-full px-8">Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <p className="text-[14px] text-gray-600 font-medium leading-relaxed">{startup?.solution_description || "How do you solve it? Add your description here."}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* DIGITAL PRESENCE */}
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center">
                <Globe className="w-4 h-4 text-[#00D395] mr-2" /> Digital Presence
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#00D395] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Edit Social Links</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>LinkedIn</Label>
                      <Input defaultValue={(startup?.social_links as any)?.linkedin} id="edit-linkedin" className="h-11 border-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram</Label>
                      <Input defaultValue={(startup?.social_links as any)?.instagram} id="edit-instagram" className="h-11 border-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label>Twitter/X</Label>
                      <Input defaultValue={(startup?.social_links as any)?.twitter} id="edit-twitter" className="h-11 border-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label>TikTok</Label>
                      <Input defaultValue={(startup?.social_links as any)?.tiktok} id="edit-tiktok" className="h-11 border-gray-100" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                      const linkedin = (document.getElementById('edit-linkedin') as HTMLInputElement).value;
                      const instagram = (document.getElementById('edit-instagram') as HTMLInputElement).value;
                      const twitter = (document.getElementById('edit-twitter') as HTMLInputElement).value;
                      const tiktok = (document.getElementById('edit-tiktok') as HTMLInputElement).value;
                      updateStartup.mutate({ social_links: { linkedin, instagram, twitter, tiktok } });
                    }} className="bg-[#00D395] text-white rounded-full px-8">Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-gray-400 border border-gray-100"><Linkedin className="w-4 h-4" /></div>
                  <span className="text-xs font-bold text-gray-700">LinkedIn</span>
                </div>
                {(startup?.social_links as any)?.linkedin ? (
                  <a href={(startup?.social_links as any).linkedin} target="_blank" className="text-[#00D395]"><ExternalLink className="w-4 h-4" /></a>
                ) : <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Not set</span>}
              </div>
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-gray-400 border border-gray-100"><Instagram className="w-4 h-4" /></div>
                  <span className="text-xs font-bold text-gray-700">Instagram</span>
                </div>
                {(startup?.social_links as any)?.instagram ? (
                  <a href={(startup?.social_links as any).instagram} target="_blank" className="text-[#00D395]"><ExternalLink className="w-4 h-4" /></a>
                ) : <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Not set</span>}
              </div>
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-gray-400 border border-gray-100"><Twitter className="w-4 h-4" /></div>
                  <span className="text-xs font-bold text-gray-700">Twitter/X</span>
                </div>
                {(startup?.social_links as any)?.twitter ? (
                  <a href={(startup?.social_links as any).twitter} target="_blank" className="text-[#00D395]"><ExternalLink className="w-4 h-4" /></a>
                ) : <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Not set</span>}
              </div>
            </CardContent>
          </Card>

          {/* MARKET & PRESENCE */}
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl group relative">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-[#878A22]" /> Market Presence
              </CardTitle>
              <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#00D395] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Edit Market Presence</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Target Market</Label>
                        <Input defaultValue={startup?.target_market} id="edit-market" className="h-11 border-gray-100" placeholder="e.g. Lagos, Nigeria" />
                      </div>
                      <div className="space-y-2">
                        <Label>Vision Statement</Label>
                        <Textarea 
                          defaultValue={startup?.vision_statement} 
                          id="edit-vision" 
                          className="min-h-[100px] border-gray-100" 
                          placeholder="Where do you see the business in 5 years?"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => {
                        const target_market = (document.getElementById('edit-market') as HTMLInputElement).value;
                        const vision_statement = (document.getElementById('edit-vision') as HTMLTextAreaElement).value;
                        updateStartup.mutate({ target_market, vision_statement });
                      }} className="bg-[#00D395] text-white rounded-full px-8">Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-500 uppercase">Target Market</span>
                  <span className="text-[#1A1A1A]">{startup?.target_market || "Global"}</span>
                </div>
                <div className="p-3 bg-[#878A22]/5 rounded-xl border border-[#878A22]/10">
                  <p className="text-[11px] text-[#878A22] font-bold uppercase tracking-widest mb-1">Vision</p>
                  <p className="text-[13px] text-gray-700 leading-relaxed font-medium italic">
                    "{startup?.vision_statement || "Your long-term vision goes here."}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
