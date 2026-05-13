import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, Upload, FileText, Loader2, Target, Zap, Rocket, 
  LineChart, Users, Megaphone, CheckCircle2, Calendar, Download, 
  Crosshair, Flame, MessageSquare, ArrowUpRight, ArrowDownRight, 
  AlertCircle, Plus, LayoutDashboard, Filter, MoreVertical, 
  TrendingUp, TrendingDown, Calculator, Globe, Sparkles, Shield, 
  ShieldCheck, Wallet, Activity, Linkedin, UserPlus, Workflow, 
  Building2, Users2, Briefcase, ExternalLink, ChevronRight,
  TrendingUp as TrendingUpIcon, DollarSign, PieChart as PieChartIcon, 
  Clock, Ghost, Search, Share2, Mail, Phone, MapPin, Twitter, 
  Instagram, Github, Linkedin as LinkedinIcon, Link as LinkIcon, ArrowRight, RefreshCw
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
  const [burnTimeframe, setBurnTimeframe] = useState<"daily" | "weekly" | "monthly">("monthly");

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
      const { data, error } = await supabase.from("team_members").select("*").eq("startup_id", id!);
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

  const { data: founderUpdates = [] } = useQuery({
    queryKey: ["founder-updates", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_updates")
        .select("id, title, content, created_at")
        .eq("startup_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });
  
  const { data: financials = [] } = useQuery({
    queryKey: ["startup-financials", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("startup_financials").select("*").eq("startup_id", id!).order("month", { ascending: true });
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
      const { data, error } = await supabase
        .from("notes")
        .select(`*`)
        .eq("startup_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
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
      refetchNotes();
      toast({ title: "Note saved", description: "Your interaction log has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });





  const cycleBurnTimeframe = () => {
    const next: Record<string, "daily" | "weekly" | "monthly"> = { daily: "weekly", weekly: "monthly", monthly: "daily" };
    setBurnTimeframe(next[burnTimeframe]);
  };

  // --- ANALYTICS ENGINE ---
  const reportingRate = useMemo(() => {
    // Logic: Last 4 weeks. A week is reported if pulses or milestones were updated.
    const weeks = [0, 1, 2, 3];
    const now = new Date();
    const reportedWeeks = weeks.filter(weekOffset => {
      const weekStart = new Date(now.getTime() - (weekOffset + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);
      
      const hasPulse = pulses.some(p => {
        const d = new Date(p.created_at || p.month);
        return d >= weekStart && d < weekEnd;
      });
      
      const hasMilestone = milestones.some(m => {
        const d = new Date(m.updated_at || m.created_at || '');
        return d >= weekStart && d < weekEnd;
      });

      return hasPulse || hasMilestone;
    });

    return Math.round((reportedWeeks.length / 4) * 100);
  }, [pulses, milestones]);

  const insights = useMemo(() => {
    if (pulses.length < 1) return null;
    const current = pulses[pulses.length - 1];
    const previous = pulses[pulses.length - 2] || null;
    const recentPulses = pulses.slice(-3);
    const avgBurn = recentPulses.reduce((sum, p) => sum + (p.expenses || 0), 0) / recentPulses.length;
    // Dynamic Burn Velocity from Financial Logs
    const sortedFinancials = [...financials].sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    const latestFin = sortedFinancials[sortedFinancials.length - 1];
    const prevFin = sortedFinancials[sortedFinancials.length - 2];
    
    const burnVelocity = (latestFin && prevFin && prevFin.expenses > 0) 
      ? (latestFin.expenses - prevFin.expenses) / prevFin.expenses 
      : 0;

    const revenue = current.mrr || 0;
    const expenses = current.expenses || 0;
    const netMargin = revenue > 0 ? (revenue - expenses) / revenue : -1;
    const newRev = previous ? Math.max(0, (current.mrr || 0) - (previous.mrr || 0)) : 0;
    const efficiency = newRev > 0 ? (expenses - revenue) / newRev : 0;
    const cash = current.cash_in_bank || 0;
    const netBurn = Math.max(0, expenses - revenue);
    
    // Dynamic Burn from Financial Logs (Grouped by Month)
    const monthlyGroups: Record<string, number> = {};
    financials.forEach(f => {
      const monthKey = f.month.slice(0, 7); // YYYY-MM
      monthlyGroups[monthKey] = (monthlyGroups[monthKey] || 0) + (f.expenses || 0);
    });

    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    const currentMonthBurn = monthlyGroups[currentMonthKey] || 0;

    // Filtered Burn for the card (Daily/Weekly/Monthly)
    const filteredFinancials = financials.filter(f => {
      const d = new Date(f.month);
      if (burnTimeframe === "monthly") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (burnTimeframe === "weekly") return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d.toDateString() === now.toDateString();
    });

    const totalBurn = filteredFinancials.reduce((sum, f) => sum + (f.expenses || 0), 0);

    // Dynamic Runway based on average monthly totals
    const monthValues = Object.values(monthlyGroups).slice(-3); // Last 3 completed/current months
    const avgMonthlyBurn = monthValues.length > 0 
      ? monthValues.reduce((sum, val) => sum + val, 0) / monthValues.length
      : current.expenses || 0;

    const runway = avgMonthlyBurn > 0 ? cash / avgMonthlyBurn : 0;
    
    return { burnVelocity, netMargin, efficiency, runway, current, previous, netBurn, totalBurn };
  }, [pulses, financials, burnTimeframe]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return (val / 1000).toFixed(1) + "k";
    return val.toLocaleString();
  };

  const chartData = useMemo(() => pulses.map(p => ({
    month: new Date(p.month).toLocaleDateString('en-US', { month: 'short' }),
    mrr: p.mrr || 0,
    expenses: p.expenses || 0,
    target: p.target_mrr || 0
  })), [pulses]);

  const isMockMode = false;

  if (loadingStartup) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!startup) return <div className="p-8 text-center text-red-500">Startup not found.</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate('/startups')} className="rounded-full hover:bg-gray-100 shrink-0 self-start md:self-center">
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
                { value: 'financials', label: 'Financials', icon: LineChart },
                { value: 'targets', label: 'Targets', icon: Target },
                { value: 'events', label: 'Events', icon: Calendar },
                { value: 'updates', label: 'Updates', icon: Zap },
                { value: 'notes', label: 'Admin Notes', icon: AlertCircle },
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
          <TabsContent value="overview" className="space-y-8 mt-0">
            {/* KPI GRID */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Monthly Revenue
                    <DollarSign className="w-3 h-3 text-[#635BFF]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{formatCurrency(insights?.current?.mrr || 0)}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500 flex items-center mt-1">
                    Current MRR
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden cursor-pointer hover:ring-1 ring-red-100 transition-all group"
                onClick={cycleBurnTimeframe}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span>Portfolio Burn</span>
                      <div className="flex items-center gap-1 text-[9px] text-red-500 lowercase">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" /> {burnTimeframe}
                      </div>
                    </div>
                    <Flame className="w-3 h-3 text-red-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{formatCurrency(insights?.totalBurn || 0)}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 flex items-center mt-1">
                    Total logged {burnTimeframe} burn
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Runway
                    <Clock className="w-3 h-3 text-amber-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {`${insights?.runway?.toFixed(1) || '0.0'}mo`}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 flex items-center mt-1">
                    {insights?.runway === 0 ? 'No active burn' : 'Based on avg monthly burn'}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Reporting Rate
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{reportingRate}%</div>
                  <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${reportingRate}%` }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
              {/* LEFT COLUMN: Vision & Key Contacts */}
              <div className="lg:col-span-2 space-y-8">
                {/* Vision Section */}
                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-primary" /> The Vision
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Elevator Pitch</p>
                      <p className="text-xl font-medium text-gray-900 leading-tight">
                        {startup.mission_statement || 'A bold vision for the future of this industry.'}
                      </p>
                    </div>
                    <Separator className="bg-gray-50" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Core Description</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {startup.description || 'No detailed description provided yet.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Contacts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-bold">Key Contacts</h3>
                    <Badge variant="outline" className="rounded-full bg-gray-50 text-gray-500 border-none font-bold text-[10px]">
                      {teamMembers.length} Members
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {teamMembers.map((member: any) => (
                      <Card key={member.id} className="border border-gray-100 shadow-sm rounded-2xl hover:border-primary/20 transition-all bg-white group">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 rounded-xl border-2 border-gray-50 group-hover:border-primary/10 transition-all">
                              <AvatarImage src={member.avatar_url || ''} />
                              <AvatarFallback className="bg-primary/5 text-primary font-bold">{member.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-gray-900 truncate">{member.full_name}</h4>
                              <p className="text-[11px] text-primary font-bold uppercase tracking-tight">{member.role}</p>
                            </div>
                          </div>
                          <div className="mt-5 pt-5 border-t border-gray-50 space-y-2">
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">{member.email || 'No email set'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{member.phone_number || 'No phone set'}</span>
                            </div>
                            {member.linkedin && (
                              <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-[#0A66C2] font-medium hover:underline">
                                <LinkedinIcon className="w-3.5 h-3.5" />
                                <span>LinkedIn Profile</span>
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {teamMembers.length === 0 && (
                      <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                        <Users2 className="h-8 w-8 mx-auto mb-3 text-gray-200" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No team members listed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Trajectory & Milestones */}
              <div className="space-y-8">
                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Revenue vs Target Projection</CardTitle>
                    <CardDescription>MRR Growth vs Planned Roadmap</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[240px] px-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 'bold'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(val) => `${currencySymbol}${val / 1000}k`} />
                        <RechartsTooltip 
                          cursor={{ fill: 'rgba(99, 91, 255, 0.05)' }} 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                        />
                        <Bar 
                          dataKey="mrr" 
                          name="Actual MRR"
                          fill="#00D395" 
                          radius={[6, 6, 0, 0]} 
                          barSize={20} 
                        />
                        <Bar 
                          dataKey="target" 
                          name="Target Projection"
                          fill="#635BFF" 
                          radius={[6, 6, 0, 0]} 
                          barSize={20} 
                          opacity={0.3}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Execution Board</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {milestones.slice(0, 4).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${m.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {m.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                          </div>
                          <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{m.title}</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] font-bold uppercase border-none ${m.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                          {m.status}
                        </Badge>
                      </div>
                    ))}
                    {milestones.length === 0 && <p className="text-center py-8 text-[10px] font-bold text-gray-300 uppercase tracking-widest">No milestones logged</p>}
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
                              <p className="text-sm font-bold text-emerald-600">+{currencySymbol}{formatCurrency(p.mrr || 0)}</p>
                              <p className="text-[10px] text-red-400">-{currencySymbol}{formatCurrency(p.expenses || 0)}</p>
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
                      {milestones.map(m => (
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
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <p className="text-sm font-bold truncate">{(att.events as any)?.title || 'Community Event'}</p>
                          <p className="text-[10px] text-gray-400">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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


          {/* 7. UPDATES */}
          <TabsContent value="updates" className="mt-0">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Founder Updates</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Real-time wins, blockers and asks from the founder.</p>
                </div>
                <Badge variant="outline" className="font-bold text-xs">
                  {founderUpdates.length} update{founderUpdates.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {founderUpdates.length === 0 && (
                <div className="py-20 text-center">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-400 italic">No updates posted yet.</p>
                </div>
              )}

              {founderUpdates.map((update) => {
                const typeConfig: Record<string, { border: string; badge: string; label: string }> = {
                  win:     { border: "border-l-[#00D395]", badge: "bg-[#00D395]/10 text-[#00D395]", label: "🏆 Win" },
                  blocker: { border: "border-l-[#FF4D4F]", badge: "bg-[#FF4D4F]/10 text-[#FF4D4F]", label: "🚧 Blocker" },
                  ask:     { border: "border-l-[#F5A623]", badge: "bg-[#F5A623]/10 text-[#F5A623]", label: "🙋 Ask" },
                };
                const detectedType = update.title?.toLowerCase() || "win";
                const cfg = typeConfig[detectedType] || typeConfig.win;
                const timeAgo = (d: string) => {
                  const diff = Date.now() - new Date(d).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${Math.floor(hrs / 24)}d ago`;
                };
                return (
                  <div
                    key={update.id}
                    className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${cfg.border} shadow-sm p-5`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {update.created_at ? timeAgo(update.created_at) : "—"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{update.content}</p>
                  </div>
                );
              })}
            </div>
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
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {(doc as any).file_type || 'PDF'} · {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}{Math.round((doc as any).size / 1024) || 256} KB
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
