import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, Upload, FileText, Loader2, Send, Target, Zap, Rocket, 
  LineChart, Users, Megaphone, CheckCircle2, Calendar, Download, 
  Crosshair, Flame, MessageSquare, ArrowUpRight, ArrowDownRight, 
  AlertCircle, Plus, LayoutDashboard, Filter, MoreVertical, 
  TrendingUp, TrendingDown, Calculator, Globe, Sparkles, Shield, 
  ShieldCheck, Wallet, Activity, Linkedin, UserPlus, Workflow, 
  Building2, Users2, Briefcase, ExternalLink, ChevronRight,
  TrendingUp as TrendingUpIcon, DollarSign, PieChart as PieChartIcon, 
  Clock, Ghost, Search, Share2, Mail, Phone, MapPin, Twitter, 
  Instagram, Github, Linkedin as LinkedinIcon, Link as LinkIcon, ArrowRight
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, 
  LineChart as RechartsLineChart, Line 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GrowthStageBar, type GrowthStage } from "@/components/GrowthStageBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tables } from "@/integrations/supabase/types";

export default function StartupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // --- DATA FETCHING (Moved to top to prevent 'used before declaration' errors) ---
  const { data: startup, isLoading: loadingStartup } = useQuery({
    queryKey: ["startup", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const currencySymbol = useMemo(() => {
    if (!startup) return '$';
    return startup.currency === 'NGN' ? '₦' : startup.currency === 'GBP' ? '£' : startup.currency === 'EUR' ? '€' : '$';
  }, [startup]);

  // --- PROFESSIONAL MOCK DATA FALLBACKS ---
  const mockRevenueData = useMemo(() => [
    { month: 'Jan', mrr: 12000, expenses: 25000 },
    { month: 'Feb', mrr: 15000, expenses: 26000 },
    { month: 'Mar', mrr: 19500, expenses: 28000 },
    { month: 'Apr', mrr: 24000, expenses: 29000 },
    { month: 'May', mrr: 28000, expenses: 31000 },
    { month: 'Jun', mrr: 35000, expenses: 32000 },
  ], []);

  const mockMilestones = useMemo(() => [
    { id: '1', title: 'MVP Launch', status: 'completed', created_at: '2024-01-15' },
    { id: '2', title: 'First 10 Paying Customers', status: 'completed', created_at: '2024-03-10' },
    { id: '3', title: `Scale to ${currencySymbol}50k MRR`, status: 'in-progress', created_at: '2024-05-01' },
  ], [currencySymbol]);

  const { data: pulses = [] } = useQuery({
    queryKey: ["startup-pulses", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pulses").select("*").eq("startup_id", id!).order("month", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("milestones").select("*").eq("startup_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["startup-team", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("startup_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_attendees").select("*, events(*)").eq("startup_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("startup_id", id!).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["notes", id],
    queryFn: async () => {
      console.log("Fetching notes for startup:", id);
      const { data, error } = await supabase
        .from("notes")
        .select(`*`)
        .eq("startup_id", id!)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching notes:", error);
        throw error;
      }
      console.log("Notes received:", data);
      return data || [];
    },
    enabled: !!id,
  });

  const [noteText, setNoteText] = useState("");
  const addNote = useMutation({
    mutationFn: async () => {
      if (!noteText.trim()) return;
      const { error } = await supabase.from("notes").insert({
        content: noteText,
        startup_id: id!,
        author_id: user?.id,
        is_private: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText("");
      refetchNotes(); // Force a direct refetch
      toast({ title: "Note saved", description: "Your interaction log has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
  const insights = useMemo(() => {
    if (pulses.length < 1) return null;
    
    const current = pulses[pulses.length - 1];
    const previous = pulses[pulses.length - 2] || null;
    
    // Burn Velocity (rolling 3-month avg)
    const recentPulses = pulses.slice(-3);
    const avgBurn = recentPulses.reduce((sum, p) => sum + (p.expenses || 0), 0) / recentPulses.length;
    const burnVelocity = previous ? ((current.expenses || 0) - (previous.expenses || 0)) / (previous.expenses || 1) : 0;
    
    // Profitability
    const revenue = current.mrr || 0;
    const expenses = current.expenses || 0;
    const netMargin = revenue > 0 ? (revenue - expenses) / revenue : -1;
    
    // Efficiency
    const newRev = previous ? Math.max(0, (current.mrr || 0) - (previous.mrr || 0)) : 0;
    const efficiency = newRev > 0 ? (expenses - revenue) / newRev : 0;
    
    // Runway
    const cash = current.cash_in_bank || 0;
    const netBurn = expenses - revenue;
    const runway = netBurn > 0 ? cash / netBurn : -1; // -1 represents Infinity

    return { burnVelocity, netMargin, efficiency, runway, current, previous, netBurn };
  }, [pulses]);

  // --- MOCK DATA CHECK ---
  const isMockMode = pulses.length === 0;
  const chartData = isMockMode ? mockRevenueData : pulses.map(p => ({
    month: new Date(p.month).toLocaleDateString('en-US', { month: 'short' }),
    mrr: p.mrr || 0,
    expenses: p.expenses || 0,
    target: p.target_mrr || 0
  }));

  if (loadingStartup) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!startup) return <div className="p-8 text-center text-red-500">Startup not found.</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="rounded-full hover:bg-gray-100 shrink-0 self-start md:self-center">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col md:flex-row items-center gap-5 w-full">
              <Avatar className="h-20 w-20 md:h-16 md:w-16 border-2 border-gray-50 shadow-sm shrink-0">
                <AvatarImage src={startup.logo_url || ''} />
                <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                  {startup.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{startup.name}</h1>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3">
                    Live Portfolio
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  Founder: {startup.founder_name} · {startup.industry || 'Tech'} · {startup.current_stage || 'Early'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 gap-2">
                <Share2 className="w-4 h-4" /> Share
              </Button>
              <Button className="rounded-xl bg-[#635BFF] hover:bg-[#5249cf] text-white gap-2 shadow-sm">
                <MessageSquare className="w-4 h-4" /> Send Nudge
              </Button>
            </div>
            <div className="w-full md:w-64">
              <GrowthStageBar currentStage={startup.current_stage as GrowthStage} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* TABS NAVBAR - Updated for Mobile Scroll */}
          <div className="overflow-x-auto no-scrollbar -mx-6 px-6 mb-8 border-b border-gray-100">
            <TabsList className="bg-transparent h-auto p-0 gap-8 justify-start w-max rounded-none">
              {[
                { value: 'overview', label: 'Overview', icon: LayoutDashboard },
                { value: 'profile', label: 'Company Profile', icon: Building2 },
                { value: 'financials', label: 'Financials', icon: LineChart },
                { value: 'targets', label: 'Targets', icon: Target },
                { value: 'events', label: 'Events', icon: Calendar },
                { value: 'team', label: 'Team', icon: Users2 },
                { value: 'updates', label: 'Updates', icon: Zap },
                { value: 'notes', label: 'Admin Notes', icon: MessageSquare },
                { value: 'vault', label: 'Vault', icon: ShieldCheck },
              ].map(tab => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-1 pb-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-all gap-2 flex-shrink-0"
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* TAB CONTENTS */}
          
          {/* 1. OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Health Score
                    <Shield className="w-3 h-3 text-emerald-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">84%</div>
                  <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '84%' }} />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Monthly Burn
                    <Flame className="w-3 h-3 text-red-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {currencySymbol}{(insights?.current?.expenses || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold text-red-500 flex items-center mt-1">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12% MoM
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Runway
                    <Clock className="w-3 h-3 text-amber-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {insights?.runway === -1 ? '∞' : `${insights?.runway?.toFixed(1) || '0.0'}mo`}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 flex items-center mt-1">
                    {insights?.runway === -1 ? 'Profitable / Default Alive' : 'Based on current burn'}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Reporting
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">100%</div>
                  <div className="text-[10px] font-bold text-emerald-500 flex items-center mt-1">
                    On track
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <Card className="lg:col-span-2 border-none shadow-sm bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Growth Trajectory</CardTitle>
                  <CardDescription>Revenue vs Target MRR progression</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isMockMode && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]"><Badge className="bg-amber-100 text-amber-700">Preview Mode</Badge></div>}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(99, 91, 255, 0.05)' }} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      />
                      <Bar dataKey="mrr" fill="#635BFF" radius={[4, 4, 0, 0]} barSize={32} />
                      <Bar dataKey="target" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="border-none shadow-sm bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Critical Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights?.runway && insights.runway < 6 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-900">Low Runway Warning</p>
                        <p className="text-xs text-red-700">Founder needs support for upcoming Series A bridge.</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <Target className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Targets Due</p>
                      <p className="text-xs text-amber-700">"MVP Launch" is nearing the 30-day deadline.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-gray-200 text-xs font-bold rounded-xl mt-4">
                    View Intervention Strategy <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 2. PROFILE */}
          <TabsContent value="profile" className="mt-0">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">The Vision</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                      <p className="text-gray-700 leading-relaxed">{startup.description || 'No description provided.'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Elevator Pitch</p>
                      <p className="text-lg font-medium text-gray-900">
                        {startup.mission_statement || 'Scale and growth for the emerging markets.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Social Presence</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: Globe, label: 'Website', value: startup.website },
                      { icon: Linkedin, label: 'LinkedIn', value: (startup.social_links as any)?.linkedin },
                      { icon: Twitter, label: 'Twitter', value: (startup.social_links as any)?.twitter },
                      { icon: Instagram, label: 'Instagram', value: (startup.social_links as any)?.instagram },
                    ].map(link => (
                      <div key={link.label} className="p-4 rounded-xl border border-gray-50 bg-gray-50/50 flex flex-col items-center text-center gap-2">
                        <link.icon className="w-5 h-5 text-primary" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{link.label}</p>
                        <p className="text-xs font-medium text-gray-900 truncate w-full">
                          {link.value ? <a href={link.value} target="_blank" className="hover:underline">{link.value.replace('https://', '')}</a> : 'Not set'}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Sector</span>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-none">{startup.sector || 'SaaS'}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Stage</span>
                      <span className="text-sm font-bold">{startup.current_stage || 'Seed'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Currency</span>
                      <span className="text-sm font-bold uppercase">{startup.currency || 'USD'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-500">Join Date</span>
                      <span className="text-sm font-bold">{new Date(startup.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 3. FINANCIALS */}
          <TabsContent value="financials" className="mt-0 space-y-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              {/* Admin Intelligence Card */}
              <Card className="lg:col-span-3 border-none shadow-[0_20px_50px_rgba(99,91,255,0.08)] bg-[#635BFF] text-white rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Calculator className="w-32 h-32" /></div>
                <CardHeader>
                  <CardTitle className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Admin Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-8 grid-cols-1 sm:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-white/60 text-xs font-medium">Burn Velocity</p>
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold">{(insights?.burnVelocity || 0) > 0 ? '+' : ''}{((insights?.burnVelocity || 0) * 100).toFixed(1)}%</p>
                        <Badge className={`mb-1 border-none ${insights?.burnVelocity && insights.burnVelocity > 0.1 ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                          {insights?.burnVelocity && insights.burnVelocity > 0.1 ? 'High Burn' : 'Stable'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-white/40">MoM change in monthly expenses</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white/60 text-xs font-medium">Net Margin</p>
                      <p className="text-3xl font-bold">{((insights?.netMargin || 0) * 100).toFixed(1)}%</p>
                      <p className="text-[10px] text-white/40">Profitability ratio per dollar earned</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white/60 text-xs font-medium">Growth Efficiency</p>
                      <p className="text-3xl font-bold">{currencySymbol}{(insights?.efficiency || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-white/40">Burn required to acquire {currencySymbol}1 of new MRR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-none shadow-sm bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {isMockMode && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]"><Badge className="bg-amber-100 text-amber-700">Preview Mode</Badge></div>}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(99, 91, 255, 0.05)' }} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      />
                      <Bar dataKey="mrr" fill="#635BFF" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">PnL Summary</CardTitle>
                </CardHeader>
                <CardContent>
                   <ScrollArea className="h-[280px] pr-4">
                     <div className="space-y-4">
                        {[...pulses].reverse().map((p, i) => (
                          <div key={p.id} className="p-3 rounded-xl border border-gray-50 bg-gray-50/30 flex justify-between items-center group hover:bg-white hover:border-gray-100 transition-all">
                            <div>
                              <p className="text-xs font-bold text-gray-900">{new Date(p.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                              <p className="text-[10px] text-gray-400">Monthly Update</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-600">+{currencySymbol}{(p.mrr || 0).toLocaleString()}</p>
                              <p className="text-[10px] text-red-400">-{currencySymbol}{(p.expenses || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                        {pulses.length === 0 && <p className="text-center text-sm text-gray-400 py-12">No pulse history.</p>}
                     </div>
                   </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 4. TARGETS */}
          <TabsContent value="targets" className="mt-0">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Execution Board</CardTitle>
                      <CardDescription>Milestones and strategic goals</CardDescription>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none">
                      {milestones.length} active
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(milestones.length > 0 ? milestones : mockMilestones).map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary/20 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${m.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                              {m.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{m.title}</p>
                              <p className="text-xs text-gray-400">Created {new Date(m.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`border-none ${m.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                            {m.status === 'completed' ? 'Achieved' : 'In Progress'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                 <Card className="border-none shadow-sm bg-white rounded-2xl bg-gradient-to-br from-[#635BFF]/5 to-transparent">
                   <CardHeader>
                     <CardTitle className="text-lg font-bold flex items-center gap-2">
                       <Zap className="w-4 h-4 text-[#635BFF]" />
                       Upcoming Target
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="text-center py-6">
                      <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white mx-auto flex items-center justify-center mb-4">
                        <Rocket className="w-10 h-10 text-primary" />
                      </div>
                      <h4 className="text-md font-bold text-gray-900 mb-1">Series A Bridge</h4>
                      <p className="text-xs text-gray-500 mb-6 px-4">Aiming for 25% MoM growth for the next 3 months to unlock funding.</p>
                      <Progress value={45} className="h-2 mb-2" />
                      <p className="text-[10px] font-bold text-primary uppercase">45% Towards Completion</p>
                   </CardContent>
                 </Card>
              </div>
            </div>
          </TabsContent>

          {/* 5. EVENTS */}
          <TabsContent value="events" className="mt-0">
            <Card className="border-none shadow-sm bg-white rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Community Attendance</CardTitle>
                <CardDescription>History of Lab events participated in</CardDescription>
              </CardHeader>
              <CardContent>
                {attendance.length > 0 ? (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {attendance.map(att => (
                      <div key={att.id} className="p-4 rounded-xl border border-gray-100 flex items-center gap-4 hover:border-primary/20 transition-all cursor-pointer">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{(att.events as any)?.title || 'Community Event'}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date((att.events as any)?.event_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No event attendance records found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. TEAM */}
          <TabsContent value="team" className="mt-0">
             <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
               {teamMembers.map(member => (
                 <Card key={member.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group hover:shadow-md transition-all">
                   <div className="h-20 bg-gradient-to-r from-primary/5 to-primary/10" />
                   <div className="px-6 pb-6 -mt-10 text-center">
                     <Avatar className="h-20 w-20 mx-auto border-4 border-white shadow-sm mb-3">
                       <AvatarImage src={member.avatar_url || ''} />
                       <AvatarFallback className="bg-gray-100 text-gray-400 text-xl font-bold">
                         {member.full_name?.substring(0, 2).toUpperCase() || '??'}
                       </AvatarFallback>
                     </Avatar>
                     <h4 className="text-md font-bold text-gray-900 group-hover:text-primary transition-colors">{member.full_name}</h4>
                     <p className="text-xs text-gray-500 font-medium">{member.role || 'Team Member'}</p>
                     <Separator className="my-4 opacity-50" />
                     <div className="flex justify-center gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-600">
                         <LinkedinIcon className="w-4 h-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                         <Mail className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 </Card>
               ))}
               <Card className="border-2 border-dashed border-gray-100 bg-transparent rounded-2xl flex flex-col items-center justify-center p-6 text-center text-gray-400 hover:border-primary/20 hover:text-primary transition-all cursor-pointer min-h-[250px]">
                 <UserPlus className="w-8 h-8 mb-2 opacity-30" />
                 <p className="text-sm font-bold">Add Team Member</p>
               </Card>
             </div>
          </TabsContent>

          {/* 7. UPDATES */}
          <TabsContent value="updates" className="mt-0">
            <Card className="border-none shadow-sm bg-white rounded-2xl max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Achievement Timeline</CardTitle>
                <CardDescription>Major wins and monthly highlights</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-gray-50" />
                <div className="space-y-8">
                  {[...pulses].reverse().filter(p => p.win).map(p => (
                    <div key={p.id} className="relative pl-12">
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center z-10">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="p-4 rounded-2xl border border-gray-50 bg-white hover:border-emerald-100 transition-all">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                          {new Date(p.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mb-2">Monthly Win</p>
                        <p className="text-sm text-gray-600 leading-relaxed italic">"{p.win}"</p>
                      </div>
                    </div>
                  ))}
                  {pulses.filter(p => p.win).length === 0 && (
                    <div className="py-20 text-center text-gray-400">
                      <Zap className="w-12 h-12 mx-auto mb-3 opacity-10" />
                      <p className="text-sm italic">No wins recorded yet. Time to go big!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 8. NOTES */}
          <TabsContent value="notes" className="mt-0">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Interaction Log</CardTitle>
                    <CardDescription>Internal admin notes and advisor comments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Textarea 
                        placeholder="Add a private note about this startup..." 
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="min-h-[120px] rounded-2xl border-gray-100 bg-gray-50/50"
                      />
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => addNote.mutate()}
                          disabled={addNote.isPending || !noteText.trim()}
                          className="bg-[#635BFF] text-white rounded-xl gap-2 font-bold px-6"
                        >
                          {addNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'} <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      {notes.length > 0 ? (
                        notes.map(note => (
                          <div key={note.id} className="p-4 rounded-xl bg-gray-50/50 border border-gray-50 relative group">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                  AD
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-bold text-gray-900">Admin</span>
                              <span className="text-[10px] text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-600">{note.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-sm text-gray-400 py-8">No notes yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Lab Lead Checklist</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      'Verify Q1 Financials',
                      'Schedule Bridge Meeting',
                      'Introduce to Angel Network',
                      'Check Logo Branding'
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded border border-gray-200" />
                        <span className="text-sm text-gray-600">{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 9. VAULT */}
          <TabsContent value="vault" className="mt-0">
             <Card className="border-none shadow-sm bg-white rounded-2xl">
               <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                   <CardTitle className="text-lg font-bold">Document Vault</CardTitle>
                   <CardDescription>Secure Data Room and files</CardDescription>
                 </div>
                 <Button variant="outline" className="rounded-xl gap-2 border-gray-200 w-full sm:w-auto">
                   <Download className="w-4 h-4" /> Download All
                 </Button>
               </CardHeader>
               <CardContent>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {documents.length > 0 ? (
                      documents.map(doc => (
                        <div key={doc.id} className="p-4 rounded-xl border border-gray-50 bg-gray-50/50 flex items-center gap-4 group hover:bg-white hover:border-primary/20 transition-all cursor-pointer">
                          <div className="p-3 rounded-lg bg-white border border-gray-100 text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{doc.file_name}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                              {(doc as any).file_type || 'PDF'} · {Math.round((doc as any).size / 1024) || 256} KB
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="md:col-span-3 py-20 text-center text-gray-400">
                        <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">The vault is empty. Request documents from founder.</p>
                      </div>
                    )}
                  </div>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
