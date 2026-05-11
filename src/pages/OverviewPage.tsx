import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Rocket, TrendingUp, Users, AlertCircle, Loader2, ArrowUpRight,
  ArrowRight, ShieldAlert, CheckCircle2, Clock,
  Calendar, Building2, Cpu, Store, Ghost, Banknote, Briefcase,
  ChevronRight, Activity, UserX, Send
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tables } from "@/integrations/supabase/types";

type Startup = Tables<"startups">;
type Pulse = Tables<"pulses">;
type Financial = Tables<"startup_financials">;
type Segment = "all" | "innovators" | "sme" | "ideation";
type Timeframe = "daily" | "weekly" | "monthly";

interface ScoredStartup extends Startup {
  score: number;
  healthScore: number;
  runway: number;
  daysSinceUpdate: number;
  latestPulse: Pulse | null;
}

function calcScore(startup: Startup, latest: Pulse | null): Omit<ScoredStartup, keyof Startup> {
  let score = 0;

  // 1. Runway (40 pts)
  const cash = latest?.cash_in_bank || 0;
  const burn = latest?.expenses || 0;
  const revenue = latest?.mrr || 0;
  const netBurn = Math.max(0, burn - revenue);
  const runway = netBurn > 0 ? cash / netBurn : 999;
  if (runway < 3) score += 40;
  else if (runway < 6) score += 20;

  // 2. Ghosting (20 pts)
  const lastDate = latest?.created_at;
  const daysSinceUpdate = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : 999;
  if (daysSinceUpdate > 30) score += 20;

  return { score, healthScore: Math.max(0, 100 - score), runway, daysSinceUpdate, latestPulse: latest };
}

interface AttendeeWithStartup {
  id: string;
  status: string | null;
  startups: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment>("all");
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);

  const { data: allStartups = [], isLoading: loadingStartups } = useQuery({
    queryKey: ["overview-startups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allPulses = [] } = useQuery({
    queryKey: ["overview-pulses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pulses").select("*").order("month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allFinancials = [] } = useQuery({
    queryKey: ["overview-financials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("startup_financials").select("*").order("month", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: eventData } = useQuery({
    queryKey: ["overview-events"],
    queryFn: async () => {
      const { data: events } = await supabase.from("events").select("id, event_date, title").gte("event_date", new Date().toISOString());
      const { data: attendeesData } = await supabase
        .from("event_attendees")
        .select("*, startups(id, name, logo_url)")
        .not("startup_id", "is", null);
      
      const attendees = (attendeesData || []) as unknown as AttendeeWithStartup[];
      
      return { 
        upcomingCount: events?.length || 0, 
        totalAttendance: attendees.length,
        attendees
      };
    },
  });

  // Group pulses by startup
  const pulseMap = useMemo(() => {
    const map = new Map<string, Pulse[]>();
    for (const p of allPulses) {
      if (!map.has(p.startup_id)) map.set(p.startup_id, []);
      map.get(p.startup_id)!.push(p);
    }
    return map;
  }, [allPulses]);

  // Filter by segment
  const startups = useMemo(() => {
    if (segment === "all") return allStartups;
    return allStartups.filter(s => {
      const stage = (s.current_stage || "").toLowerCase();
      if (segment === "sme") return stage === "sme" || stage === "smes";
      return stage === segment.toLowerCase();
    });
  }, [allStartups, segment]);

  // Score every startup
  const scored: ScoredStartup[] = useMemo(() => {
    return startups.map(s => {
      const pulses = pulseMap.get(s.id) || [];
      return { ...s, ...calcScore(s, pulses[0] || null) };
    }).sort((a, b) => b.score - a.score);
  }, [startups, pulseMap]);

  // Aggregate KPIs
  const agg = useMemo(() => {
    let totalRev = 0, totalBurn = 0, totalHead = 0, reporting = 0;
    for (const s of scored) {
      if (s.latestPulse) {
        totalRev += s.latestPulse.mrr || 0;
        totalBurn += s.latestPulse.expenses || 0;
        totalHead += s.latestPulse.team_size || 0;
        if (s.daysSinceUpdate <= 30) reporting++;
      }
    }
    const compliance = scored.length > 0 ? Math.round((reporting / scored.length) * 100) : 0;
    return { totalRev, totalBurn, totalHead, compliance, totalStartups: scored.length };
  }, [scored]);

  // Financial Chart Data (Aggregate)
  const financialChartData = useMemo(() => {
    const filtered = allFinancials.filter(f => {
      // If segment is not all, only include financials for startups in that segment
      if (segment === "all") return true;
      const s = allStartups.find(startup => startup.id === f.startup_id);
      const stage = (s?.current_stage || "").toLowerCase();
      if (segment === "sme") return stage === "sme" || stage === "smes";
      return stage === segment.toLowerCase();
    });

    const groups: Record<string, { label: string; revenue: number; expenses: number }> = {};
    
    filtered.forEach(f => {
      let key = "";
      let label = "";
      const date = new Date(f.month);
      
      if (timeframe === "daily") {
        key = f.month;
        label = date.toLocaleDateString("default", { day: "numeric", month: "short" });
      } else if (timeframe === "weekly") {
        // Simple week grouping
        const week = Math.floor(date.getDate() / 7);
        key = `${date.getFullYear()}-${date.getMonth()}-W${week}`;
        label = `W${week+1} ${date.toLocaleDateString("default", { month: "short" })}`;
      } else {
        key = f.month.substring(0, 7); // YYYY-MM
        label = date.toLocaleDateString("default", { month: "short", year: "2-digit" });
      }

      if (!groups[key]) groups[key] = { label, revenue: 0, expenses: 0 };
      groups[key].revenue += f.revenue || 0;
      groups[key].expenses += f.expenses || 0;
    });

    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label)).slice(-12);
  }, [allFinancials, timeframe, segment, allStartups]);

  // Donut Chart Data
  const donutData = useMemo(() => {
    const counts = { Ideation: 0, Innovators: 0, SME: 0 };
    allStartups.forEach(s => {
      const stage = s.current_stage || "Ideation";
      if (stage === "Ideation") counts.Ideation++;
      else if (stage === "Innovators") counts.Innovators++;
      else if (stage === "SME") counts.SME++;
    });
    return [
      { name: "Ideation", value: counts.Ideation, color: "#635BFF" },
      { name: "Innovators", value: counts.Innovators, color: "#00D395" },
      { name: "SMEs", value: counts.SME, color: "#F5A623" },
    ].filter(d => d.value > 0);
  }, [allStartups]);

  // Ghosting list (> 30 days or never reported)
  const ghosting = scored.filter(s => s.daysSinceUpdate > 30);

  const fmtK = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toString();
  };

  if (loadingStartups) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const CHART_COLORS = ["#635BFF", "#00D395", "#F5A623", "#FF4D4F", "#8b5cf6"];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">Global Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed font-medium">
            Portfolio intelligence & Lab vitality. Track aggregate performance and engagement across all ventures.
          </p>
        </div>
        <Badge variant="outline" className="bg-[#00D395]/10 text-[#00D395] border-[#00D395]/20 px-3 py-1 shrink-0 h-fit">
          <span className="w-2 h-2 rounded-full bg-[#00D395] mr-2 animate-pulse"></span>
          Live Portfolio Sync
        </Badge>
      </div>

      {/* Segment Toggle */}
      <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs gap-2 font-bold uppercase tracking-wider">All</TabsTrigger>
          <TabsTrigger value="innovators" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs gap-2 font-bold uppercase tracking-wider">Innovators</TabsTrigger>
          <TabsTrigger value="sme" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs gap-2 font-bold uppercase tracking-wider">SMEs</TabsTrigger>
          <TabsTrigger value="ideation" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs gap-2 font-bold uppercase tracking-wider">Ideation</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 5-Card KPI Strip */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Ventures", value: agg.totalStartups.toString(), icon: Rocket, trend: "Total active lab", color: "text-[#635BFF]", bg: "bg-[#635BFF]/10" },
          { label: "Total Lab Revenue", value: fmtK(agg.totalRev), icon: Banknote, trend: "Combined MRR", color: "text-[#00D395]", bg: "bg-[#00D395]/10" },
          { label: "Portfolio Burn", value: fmtK(agg.totalBurn), icon: Activity, trend: "Monthly expenses", color: "text-[#FF4D4F]", bg: "bg-[#FF4D4F]/10" },
          { label: "Jobs Created", value: agg.totalHead.toString(), icon: Users, trend: "Total headcount", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Reporting Rate", value: `${agg.compliance}%`, icon: CheckCircle2, trend: "Last 30 days", color: agg.compliance < 70 ? "text-amber-600" : "text-[#00D395]", bg: agg.compliance < 70 ? "bg-amber-50" : "bg-[#00D395]/10" },
        ].map(kpi => (
          <Card key={kpi.label} className="relative overflow-hidden border-none bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.label}</CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}><kpi.icon className="h-4 w-4" /></div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-heading text-gray-900">{kpi.value}</p>
              <span className="text-[10px] font-bold text-gray-400">{kpi.trend}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Main Chart: Aggregate Financials */}
        <Card className="lg:col-span-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Aggregate Revenue vs. Burn
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter bg-gray-50 text-gray-400 border-none">Self-Reported</Badge>
              </CardTitle>
              <CardDescription className="text-xs font-medium">Combined financial trajectory across the selected segment.</CardDescription>
            </div>
            <div className="bg-gray-50/80 p-1 rounded-xl flex gap-1 border border-gray-100">
              {(["daily", "weekly", "monthly"] as Timeframe[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    timeframe === t ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 700 }} />
                <RechartsTooltip cursor={{ fill: "#F8FAFC" }} contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px", fontWeight: "bold" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold", paddingTop: "20px" }} />
                <Bar dataKey="revenue" name="Revenue" fill="#00D395" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="expenses" name="Expenses" fill="#FF4D4F" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut Chart: Portfolio Composition */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Portfolio Composition</CardTitle>
            <CardDescription className="text-xs font-medium">Split by startup category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between p-2 rounded-xl bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs font-bold text-gray-700">{d.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ghosting Radar */}
        <Card className="lg:col-span-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-gray-50/30 border-b border-gray-50 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Ghost className="w-5 h-5 text-purple-500" />
                  Ghosting Radar
                </CardTitle>
                <CardDescription className="text-xs font-medium">Founders who haven't reported in 30+ days.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-white border-gray-100 text-[10px] font-bold">
                {ghosting.length} Inactive
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {ghosting.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold">100% Engagement</p>
                  <p className="text-xs mt-1">All founders have reported recently.</p>
                </div>
              ) : (
                ghosting.map(s => (
                  <div key={s.id} onClick={() => navigate(`/startups/${s.id}`)} className="flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                        <UserX className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{s.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{s.founder_name || "Unknown Founder"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-xs font-black ${s.daysSinceUpdate > 60 ? "text-red-500" : "text-amber-500"}`}>
                          {s.daysSinceUpdate >= 999 ? "NEVER" : `${s.daysSinceUpdate}d`}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Since Last Pulse</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all">
                        <Send className="w-3 h-3 mr-1" /> Nudge
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Community Pulse */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Community Pulse
            </CardTitle>
            <CardDescription className="text-xs font-medium">Lab engagement and participation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Upcoming Events</p>
                <p className="text-2xl font-black text-primary mt-1">{eventData?.upcomingCount || 0}</p>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-sm"><Calendar className="h-5 w-5 text-primary" /></div>
            </div>
            <div 
              className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-accent/10 cursor-pointer hover:bg-accent/10 transition-colors group"
              onClick={() => setIsAttendeesOpen(true)}
            >
              <div>
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Active Attendees</p>
                <p className="text-2xl font-black text-accent mt-1">{eventData?.totalAttendance || 0}</p>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Users className="h-5 w-5 text-accent" /></div>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl h-10 border-gray-200" onClick={() => navigate('/events')}>
              Open Event Hub <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Attendees Drill-down Modal */}
      <Dialog open={isAttendeesOpen} onOpenChange={setIsAttendeesOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Active Attendees
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500">
              Startups participating in upcoming community sessions.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="mt-4 max-h-[60vh] pr-4">
            <div className="space-y-3">
              {eventData?.attendees && eventData.attendees.length > 0 ? (
                eventData.attendees.map((att, idx) => (
                  <div 
                    key={att.id || idx}
                    onClick={() => {
                      setIsAttendeesOpen(false);
                      if (att.startups?.id) navigate(`/startups/${att.startups.id}`);
                    }}
                    className="flex items-center gap-4 p-3 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-accent/30 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <Avatar className="h-10 w-10 border border-white shadow-sm">
                      <AvatarImage src={att.startups?.logo_url} />
                      <AvatarFallback className="bg-accent/10 text-accent font-black text-xs">
                        {att.startups?.name?.substring(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate group-hover:text-accent transition-colors">
                        {att.startups?.name || "Unknown Startup"}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                        {att.status || "Registered"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-300">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No attendees recorded yet.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
