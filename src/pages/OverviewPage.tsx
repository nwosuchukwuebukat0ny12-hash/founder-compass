import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Rocket, TrendingUp, Users, AlertCircle, Loader2, ArrowUpRight,
  ArrowRight, ShieldAlert, CheckCircle2, Clock,
  Calendar, Building2, Cpu, Store, Ghost, Banknote, Briefcase,
  ChevronRight, Activity, UserX, Send, RefreshCw
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

  // Custom Nudge Dialog States
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [nudgeStartup, setNudgeStartup] = useState<{ id: string; name: string; founderId: string | null; founderName: string } | null>(null);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const [nudgeType, setNudgeType] = useState<"warning" | "error" | "info">("warning");

  const sendNudge = useMutation({
    mutationFn: async ({ startupId, founderId, name, founderName, message, type }: { startupId: string; founderId: string | null; name: string; founderName: string; message: string; type: "warning" | "error" | "info" }) => {
      let targetUserId = founderId;
      if (!targetUserId) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("startup_id", startupId)
          .limit(1);
        if (profiles && profiles.length > 0) {
          targetUserId = profiles[0].id;
        }
      }

      const titleEmoji = type === "error" ? "🚨 Lab Urgent Alert" : type === "warning" ? "⚠️ Lab Warning Alert" : "ℹ️ Lab Info Alert";

      if (targetUserId) {
        const { error } = await supabase.from("notifications").insert({
          user_id: targetUserId,
          title: titleEmoji,
          message: message.trim(),
          type: type === "error" ? "error" : type === "warning" ? "warning" : "info",
        });
        if (error) throw error;
        return { isDemo: false };
      } else {
        const { error } = await supabase.from("notes").insert({
          content: `🎯 [System Log] Sent accountability nudge to founder ${founderName || "David Chen"}.\n\n[Severity: ${type.toUpperCase()}]\nMessage: "${message.trim()}"`,
          startup_id: startupId,
          is_private: false
        });
        if (error) throw error;
        return { isDemo: true };
      }
    },
    onSuccess: (data, { name, founderName }) => {
      setIsNudgeOpen(false);
      if (data.isDemo) {
        toast({
          title: "Message Sent! ⚡ (Demo Mode)",
          description: `Simulated alert sent to founder ${founderName || "David Chen"} with your message.`,
        });
      } else {
        toast({
          title: "Message Sent! ⚡",
          description: `Alerted founder with your message.`,
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send nudge",
        description: err.message,
        variant: "destructive",
      });
    }
  });

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

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["overview-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("id, startup_id, amount, type, date").order("date", { ascending: true });
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
    let totalRev = 0, totalHead = 0, reporting = 0;
    
    // Revenue and Headcount from Pulses (Manual MRR input)
    for (const s of scored) {
      if (s.latestPulse) {
        totalRev += s.latestPulse.mrr || 0;
        totalHead += s.latestPulse.team_size || 0;
        if (s.daysSinceUpdate <= 30) reporting++;
      }
    }

    // Portfolio Burn from Transactions (Live)
    const latestTransactions = allTransactions.filter(tx => {
      // 1. Filter by segment (only startups currently in 'scored')
      const isInSegment = scored.some(s => s.id === tx.startup_id);
      if (!isInSegment) return false;

      // 2. Filter by timeframe
      const date = new Date(tx.date);
      const now = new Date();
      if (timeframe === "monthly") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (timeframe === "weekly") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      }
      return date.toDateString() === now.toDateString();
    });

    const totalBurn = latestTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const compliance = scored.length > 0 ? Math.round((reporting / scored.length) * 100) : 0;
    return { totalRev, totalBurn, totalHead, compliance, totalStartups: scored.length };
  }, [scored, allTransactions, timeframe]);

  // Financial Chart Data (Aggregate from Transactions)
  const financialChartData = useMemo(() => {
    const groups: Record<string, { label: string; revenue: number; expenses: number; timestamp: number }> = {};
    const now = new Date();
    
    allTransactions.forEach(tx => {
      // 1. Filter by segment
      if (segment !== "all") {
        const s = allStartups.find(startup => startup.id === tx.startup_id);
        const stage = (s?.current_stage || "").toLowerCase();
        const matchesSME = segment === "sme" && (stage === "sme" || stage === "smes");
        const matchesOther = stage === segment.toLowerCase();
        if (!matchesSME && !matchesOther) return;
      }

      const date = new Date(tx.date);
      let key = "";
      let label = "";

      if (timeframe === "daily") {
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return;
        key = tx.date.slice(0, 10);
        label = date.toLocaleDateString("default", { day: "numeric", month: "short" });
      } else if (timeframe === "weekly") {
        const diffWeeks = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks > 6) return;
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNum}`;
        label = `W${weekNum}`;
      } else {
        const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
        if (diffMonths > 6) return;
        key = tx.date.slice(0, 7);
        label = date.toLocaleDateString("default", { month: "short" });
      }

      if (!groups[key]) {
        groups[key] = { label, revenue: 0, expenses: 0, timestamp: date.getTime() };
      }

      if (tx.type === 'income') groups[key].revenue += (tx.amount || 0);
      if (tx.type === 'expense') groups[key].expenses += (tx.amount || 0);
    });

    return Object.values(groups).sort((a, b) => a.timestamp - b.timestamp);
  }, [allTransactions, timeframe, segment, allStartups]);

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

  const cycleTimeframe = () => {
    const next: Record<Timeframe, Timeframe> = { daily: "weekly", weekly: "monthly", monthly: "daily" };
    setTimeframe(next[timeframe]);
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
        { [
          { label: "Total Ventures", value: agg.totalStartups.toString(), icon: Rocket, trend: "Total active lab", color: "text-[#635BFF]", bg: "bg-[#635BFF]/10" },
          { label: "Total Lab Revenue (Monthly)", value: fmtK(agg.totalRev), icon: Banknote, trend: "Combined MRR", color: "text-[#00D395]", bg: "bg-[#00D395]/10" },
          { label: "Portfolio Burn", value: fmtK(agg.totalBurn), icon: Activity, trend: "Dynamic burn in period", color: "text-[#FF4D4F]", bg: "bg-[#FF4D4F]/10" },
          { label: "Jobs Created", value: agg.totalHead.toString(), icon: Users, trend: "Total headcount", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Reporting Rate", value: `${agg.compliance}%`, icon: CheckCircle2, trend: "Last 30 days", color: agg.compliance < 70 ? "text-amber-600" : "text-[#00D395]", bg: agg.compliance < 70 ? "bg-amber-50" : "bg-[#00D395]/10" },
        ].map(kpi => {
          const isBurnCard = kpi.label === "Portfolio Burn";
          return (
            <Card 
              key={kpi.label} 
              className={`relative overflow-hidden border-none bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl transition-all ${isBurnCard ? 'cursor-pointer hover:ring-1 ring-[#FF4D4F]/30' : ''}`}
              onClick={isBurnCard ? cycleTimeframe : undefined}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex flex-col">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.label}</CardTitle>
                  {isBurnCard && (
                    <div className="flex items-center gap-1 mt-1">
                      <RefreshCw className="w-2.5 h-2.5 text-[#FF4D4F] animate-spin-slow" />
                      <span className="text-[9px] font-bold text-[#FF4D4F] uppercase tracking-tighter">{timeframe}</span>
                    </div>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}><kpi.icon className="h-4 w-4" /></div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-heading text-gray-900">{kpi.value}</p>
                <span className="text-[10px] font-bold text-gray-400">{isBurnCard ? `Total logged ${timeframe} burn` : kpi.trend}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Main Chart: Aggregate Financials */}
        <Card className="lg:col-span-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Aggregate Income vs. Burn
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setNudgeStartup({
                            id: s.id,
                            name: s.name,
                            founderId: s.founder_id,
                            founderName: s.founder_name
                          });
                          setNudgeMessage(`Hi ${s.founder_name || "there"}! The Collective Lab team noticed that your startup, ${s.name}, hasn't logged a weekly pulse update in over 30 days. Please take 2 minutes to update your weekly metrics and targets in the portal.`);
                          setNudgeType("warning");
                          setIsNudgeOpen(true);
                        }}
                        className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider hover:bg-[#635BFF] hover:text-white hover:border-[#635BFF] transition-all gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        Message
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

      {/* Interactive Custom Nudge Modal */}
      <Dialog open={isNudgeOpen} onOpenChange={setIsNudgeOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white border-none rounded-3xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-[#635BFF]" />
              Send Message to Founder
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Customize and dispatch a targeted message to the founder of <span className="font-semibold text-gray-800">{nudgeStartup?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-4">
            {/* Severity Level */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Message Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "warning", label: "⚠️ Warning", activeClass: "border-amber-200 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20" },
                  { value: "error", label: "🚨 Urgent", activeClass: "border-rose-200 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20" },
                  { value: "info", label: "ℹ️ Info", activeClass: "border-sky-200 bg-sky-50 text-sky-800 ring-2 ring-sky-500/20" }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNudgeType(type.value as any)}
                    className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      nudgeType === type.value
                        ? type.activeClass
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Custom Message</Label>
                <span className="text-[10px] text-gray-400 font-medium">Fully editable</span>
              </div>
              <Textarea
                value={nudgeMessage}
                onChange={(e) => setNudgeMessage(e.target.value)}
                placeholder="Type your custom message..."
                className="min-h-[120px] rounded-2xl border-gray-200 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10 text-sm p-4 resize-none leading-relaxed"
              />
            </div>

            {/* Dynamic Card Preview */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex gap-3.5 items-start">
              <div className={`p-2 rounded-xl border ${
                nudgeType === "error" ? "bg-rose-50 border-rose-100 text-rose-600" :
                nudgeType === "warning" ? "bg-amber-50 border-amber-100 text-amber-600" :
                "bg-sky-50 border-sky-100 text-sky-600"
              }`}>
                {nudgeType === "error" ? <AlertCircle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-none">Founder Preview</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-1">Recipient: {nudgeStartup?.founderName}</p>
                <p className="text-xs text-gray-500 mt-2.5 italic line-clamp-2 leading-relaxed">
                  "{nudgeMessage || "Type a message above to see preview..."}"
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsNudgeOpen(false)}
              className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (nudgeStartup) {
                  sendNudge.mutate({
                    startupId: nudgeStartup.id,
                    founderId: nudgeStartup.founderId,
                    name: nudgeStartup.name,
                    founderName: nudgeStartup.founderName,
                    message: nudgeMessage,
                    type: nudgeType
                  });
                }
              }}
              disabled={sendNudge.isPending || !nudgeMessage.trim()}
              className="rounded-xl bg-[#635BFF] hover:bg-[#5249cf] text-white font-bold gap-2 min-w-[130px] shadow-md shadow-[#635BFF]/15"
            >
              {sendNudge.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sendNudge.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
