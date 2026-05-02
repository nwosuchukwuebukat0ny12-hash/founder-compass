import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Rocket, TrendingUp, Users, AlertCircle, Loader2, ArrowUpRight,
  ArrowRight, ShieldAlert, CheckCircle2, Clock,
  Calendar, Building2, Cpu, Store, Ghost, Banknote, Briefcase,
  ChevronRight, Activity, UserX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
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
type Segment = "all" | "tech" | "smes";

interface RiskReason {
  label: string;
  detail: string;
  severity: "critical" | "warning";
}

interface ScoredStartup extends Startup {
  score: number;
  healthScore: number;
  reasons: RiskReason[];
  runway: number;
  daysSinceUpdate: number;
  latestPulse: Pulse | null;
}

function classifyStage(stage: string | null): "Early" | "Growth" | "Maturity" {
  const s = (stage || "").toLowerCase();
  if (["ideation", "mvp", "seed", "program"].includes(s)) return "Early";
  if (["scaling", "series a", "expansion", "mentorship", "growth"].includes(s)) return "Growth";
  if (["profitability", "exit-ready", "sustainability", "flourish", "maturity"].includes(s)) return "Maturity";
  return "Early";
}

const stageConfig = {
  Early: { color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Early Stage", desc: "Ideation · MVP · Seed" },
  Growth: { color: "#8b5cf6", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", label: "Growth Stage", desc: "Scaling · Series A · Expansion" },
  Maturity: { color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Maturity Stage", desc: "Profitability · Exit-Ready" },
};

function calcScore(startup: Startup, latest: Pulse | null, previous: Pulse | null): Omit<ScoredStartup, keyof Startup> {
  let score = 0;
  const reasons: RiskReason[] = [];

  // 1. Runway (40 pts)
  const cash = latest?.cash_in_bank || 0;
  const burn = latest?.expenses || 0;
  const runway = burn > 0 ? cash / burn : 999;
  if (runway < 3) { score += 40; reasons.push({ label: "Critical Runway", detail: `${runway.toFixed(1)}mo`, severity: "critical" }); }
  else if (runway < 6) { score += 20; reasons.push({ label: "Low Runway", detail: `${runway.toFixed(1)}mo`, severity: "warning" }); }

  // 2. Revenue decline (20 pts)
  const curRev = latest?.mrr || 0;
  const prevRev = previous?.mrr || 0;
  if (prevRev > 0 && curRev < prevRev) {
    score += 20;
    reasons.push({ label: "Revenue Decline", detail: `-${((prevRev - curRev) / prevRev * 100).toFixed(0)}%`, severity: "warning" });
  }

  // 3. Churn (20 pts)
  const newU = latest?.new_users || 0;
  const lostU = latest?.lost_users || 0;
  if (lostU > newU && lostU > 0) {
    score += 20;
    reasons.push({ label: "Negative Net Growth", detail: `+${newU} / -${lostU}`, severity: "warning" });
  }

  // 4. Ghosting (20 pts)
  const lastDate = latest?.created_at;
  const daysSinceUpdate = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : 999;
  if (daysSinceUpdate > 30) {
    score += 20;
    reasons.push({ label: "Silent Founder", detail: `${daysSinceUpdate}d ago`, severity: "critical" });
  }

  return { score, healthScore: Math.max(0, 100 - score), reasons, runway, daysSinceUpdate, latestPulse: latest };
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment>("all");
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);

  const { data: allStartups = [], isLoading: loadingStartups } = useQuery({
    queryKey: ["overview-startups"],
    queryFn: async () => { const { data, error } = await supabase.from("startups").select("*"); if (error) throw error; return data || []; },
  });

  const { data: allPulses = [] } = useQuery({
    queryKey: ["overview-pulses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pulses").select("*").order("month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: eventData } = useQuery({
    queryKey: ["overview-events"],
    queryFn: async () => {
      const { data: events } = await supabase.from("events").select("id, event_date, title").gte("event_date", new Date().toISOString());
      const { data: attendees } = await supabase
        .from("event_attendees")
        .select("*, startups(id, name, logo_url)")
        .not("startup_id", "is", null);
      
      return { 
        upcomingCount: events?.length || 0, 
        totalAttendance: attendees?.length || 0,
        attendees: attendees || []
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
    // Map UI segments to database business_model values
    const targetModel = segment === "tech" ? "tech_startup" : "sme";
    return allStartups.filter(s => (s.business_model || "").toLowerCase() === targetModel);
  }, [allStartups, segment]);

  // Score every startup
  const scored: ScoredStartup[] = useMemo(() => {
    return startups.map(s => {
      const pulses = pulseMap.get(s.id) || [];
      return { ...s, ...calcScore(s, pulses[0] || null, pulses[1] || null) };
    }).sort((a, b) => b.score - a.score);
  }, [startups, pulseMap]);

  // Aggregate KPIs
  const agg = useMemo(() => {
    let totalRev = 0, totalBurn = 0, totalHead = 0, reporting = 0;
    const now = Date.now();
    for (const s of scored) {
      if (s.latestPulse) {
        totalRev += s.latestPulse.mrr || 0;
        totalBurn += s.latestPulse.expenses || 0;
        totalHead += s.latestPulse.team_size || 0;
        if (s.daysSinceUpdate <= 30) reporting++;
      }
    }
    const compliance = scored.length > 0 ? Math.round((reporting / scored.length) * 100) : 0;
    return { totalRev, totalBurn, totalHead, compliance };
  }, [scored]);

  // Health distribution
  const healthDist = useMemo(() => {
    let healthy = 0, atRisk = 0, critical = 0;
    for (const s of scored) {
      if (s.score <= 20) healthy++;
      else if (s.score <= 50) atRisk++;
      else critical++;
    }
    return { healthy, atRisk, critical };
  }, [scored]);

  // Taxonomy
  const taxonomyData = useMemo(() => {
    const counts = { Early: 0, Growth: 0, Maturity: 0 };
    startups.forEach(s => { counts[classifyStage(s.current_stage)]++; });
    return [
      { name: "Early Stage", count: counts.Early, ...stageConfig.Early },
      { name: "Growth Stage", count: counts.Growth, ...stageConfig.Growth },
      { name: "Maturity Stage", count: counts.Maturity, ...stageConfig.Maturity },
    ];
  }, [startups]);

  // Intervention queue (score > 0)
  const interventionQueue = scored.filter(s => s.score > 0);
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">Global Command Center</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Decision-grade portfolio intelligence. Spot risk, track compliance, and allocate resources across the Collective Lab.
          </p>
        </div>
        <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20 px-3 py-1 shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent mr-2 animate-pulse"></span>
          Live Portfolio Sync
        </Badge>
      </div>

      {/* Segment Toggle */}
      <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-2"><Building2 className="h-3.5 w-3.5" /> All</TabsTrigger>
          <TabsTrigger value="tech" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-2"><Cpu className="h-3.5 w-3.5" /> Tech</TabsTrigger>
          <TabsTrigger value="smes" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-2"><Store className="h-3.5 w-3.5" /> SMEs</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Universal KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Lab Revenue", value: fmtK(agg.totalRev), icon: Banknote, trend: `${scored.length} ventures reporting`, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Portfolio Burn", value: fmtK(agg.totalBurn), icon: Activity, trend: agg.totalBurn > agg.totalRev ? "Burn > Revenue ⚠" : "Sustainable", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Jobs Created", value: agg.totalHead.toString(), icon: Users, trend: "Total headcount", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Reporting Rate", value: `${agg.compliance}%`, icon: CheckCircle2, trend: agg.compliance < 70 ? "Low compliance ⚠" : "On track", color: agg.compliance < 70 ? "text-red-600" : "text-emerald-600", bg: agg.compliance < 70 ? "bg-red-50" : "bg-emerald-50" },
        ].map(kpi => (
          <Card key={kpi.label} className="relative overflow-hidden border bg-card/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}><kpi.icon className="h-4 w-4" /></div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-heading text-foreground">{kpi.value}</p>
              <span className="text-xs font-medium text-muted-foreground">{kpi.trend}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolio Health Distribution */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Portfolio Health Distribution</CardTitle>
          <CardDescription className="text-xs">Based on Vulnerability Score: Runway (40%) · Revenue Growth (20%) · Customer Churn (20%) · Reporting (20%)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            {[
              { label: "Healthy", count: healthDist.healthy, color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50" },
              { label: "At Risk", count: healthDist.atRisk, color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50" },
              { label: "Critical", count: healthDist.critical, color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50" },
            ].map(b => (
              <div key={b.label} className={`flex-1 rounded-xl p-4 ${b.bgLight} border`}>
                <p className={`text-xs font-medium ${b.textColor} opacity-80`}>{b.label}</p>
                <p className={`text-2xl font-bold font-heading mt-1 ${b.textColor}`}>{b.count}</p>
              </div>
            ))}
          </div>
          {scored.length > 0 && (
            <div className="w-full h-3 rounded-full bg-muted flex overflow-hidden">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(healthDist.healthy / scored.length) * 100}%` }} />
              <div className="bg-amber-500 transition-all" style={{ width: `${(healthDist.atRisk / scored.length) * 100}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${(healthDist.critical / scored.length) * 100}%` }} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Taxonomy + Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lifecycle Taxonomy */}
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                Lifecycle Taxonomy
                <Badge variant="secondary" className="bg-muted font-mono shrink-0">3-Stage Pipeline</Badge>
              </CardTitle>
              <CardDescription>Portfolio distribution across the unified lifecycle.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {taxonomyData.map(stage => {
                  const pct = startups.length > 0 ? Math.round((stage.count / startups.length) * 100) : 0;
                  return (
                    <div key={stage.name} className={`rounded-xl border p-4 ${stage.bg} ${stage.border}`}>
                      <p className={`text-xs font-medium ${stage.text} opacity-80`}>{stage.desc}</p>
                      <p className={`text-3xl font-bold font-heading mt-2 ${stage.text}`}>{stage.count}</p>
                      <p className={`text-xs font-medium mt-1 ${stage.text} opacity-60`}>{pct}% of portfolio</p>
                    </div>
                  );
                })}
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taxonomyData} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <RechartsTooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={80}>
                      {taxonomyData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Intervention Queue */}
          <Card className="shadow-sm border border-amber-200/50">
            <CardHeader className="bg-amber-50/50 border-b border-amber-100 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                <ShieldAlert className="w-5 h-5 mr-2 text-amber-600" />
                Intervention Queue
                {interventionQueue.length > 0 && <Badge className="ml-auto bg-amber-500 text-white">{interventionQueue.length}</Badge>}
              </CardTitle>
              <CardDescription>Startups ranked by Vulnerability Score. Higher = needs attention first.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {interventionQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                  <p className="font-medium text-sm">All Clear</p>
                  <p className="text-xs mt-1">No ventures require immediate intervention.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interventionQueue.slice(0, 6).map(s => {
                    const scoreColor = s.score > 50 ? "text-red-600 bg-red-50 border-red-200" : "text-amber-600 bg-amber-50 border-amber-200";
                    return (
                      <div key={s.id} onClick={() => navigate(`/startups/${s.id}`)} className="group p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{s.name}</h4>
                            <p className="text-xs text-muted-foreground">{s.industry || s.sector || "General"} · {classifyStage(s.current_stage)}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs font-bold border ${scoreColor}`}>
                            Risk: {s.score}/100
                          </Badge>
                        </div>
                        {/* Score Breakdown Metrics */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {s.reasons.map((r, i) => (
                            <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {r.label}: {r.detail}
                            </span>
                          ))}
                        </div>
                        {/* Quick Vitals */}
                        {s.latestPulse && (
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t pt-2 mt-1">
                            <span>Rev: {fmtK(s.latestPulse.mrr || 0)}</span>
                            <span>Burn: {fmtK(s.latestPulse.expenses || 0)}</span>
                            <span>Team: {s.latestPulse.team_size || 0}</span>
                            <span className="ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center">Review <ChevronRight className="w-3 h-3 ml-0.5" /></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {interventionQueue.length > 6 && (
                    <Button variant="ghost" className="w-full text-xs" onClick={() => navigate("/startups")}>
                      View All {interventionQueue.length} Flagged Ventures <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Ghosting Radar */}
          <Card className="shadow-sm border border-purple-200/50">
            <CardHeader className="bg-purple-50/50 border-b border-purple-100 pb-4">
              <CardTitle className="text-base font-semibold flex items-center">
                <Ghost className="w-4 h-4 mr-2 text-purple-600" />
                Ghosting Radar
              </CardTitle>
              <CardDescription className="text-xs">Founders who haven't reported in 30+ days.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {ghosting.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">100% Engaged</p>
                  <p className="text-xs mt-1">All founders reported within 30 days.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ghosting.slice(0, 5).map(s => (
                    <div key={s.id} onClick={() => navigate(`/startups/${s.id}`)} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <UserX className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.founder_name || "Unknown"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] border-none shrink-0 ${s.daysSinceUpdate > 60 ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>
                        {s.daysSinceUpdate >= 999 ? "Never" : `${s.daysSinceUpdate}d silent`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Community Pulse */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                Community Pulse
              </CardTitle>
              <CardDescription className="text-xs">Lab engagement and event participation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground">Upcoming Events</p>
                    <p className="text-xl font-bold font-heading text-foreground">{eventData?.upcomingCount || 0}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="h-4 w-4 text-primary" /></div>
                </div>
                <div 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => setIsAttendeesOpen(true)}
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Total Attendees</p>
                    <p className="text-xl font-bold font-heading text-foreground">{eventData?.totalAttendance || 0}</p>
                  </div>
                  <div className="p-2 bg-accent/10 rounded-lg group-hover:scale-110 transition-transform"><Users className="h-4 w-4 text-accent" /></div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate('/events')}>
                  Open Event Hub <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Legend */}
          <Card className="shadow-sm border bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scoring Methodology</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground space-y-2">
              <div className="flex justify-between"><span>🔴 Runway &lt; 3 months</span><span className="font-bold">40 pts</span></div>
              <div className="flex justify-between"><span>🟡 Revenue declining MoM</span><span className="font-bold">20 pts</span></div>
              <div className="flex justify-between"><span>🟡 Churn &gt; New customers</span><span className="font-bold">20 pts</span></div>
              <div className="flex justify-between"><span>🔴 No update in 30+ days</span><span className="font-bold">20 pts</span></div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-foreground text-xs">
                <span>Max Vulnerability</span><span>100 pts</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attendees Drill-down Modal */}
      <Dialog open={isAttendeesOpen} onOpenChange={setIsAttendeesOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0f0f0f] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Community Attendees
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Active startups participating in upcoming community events.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="mt-4 max-h-[60vh] pr-4">
            <div className="space-y-3">
              {eventData?.attendees && eventData.attendees.length > 0 ? (
                eventData.attendees.map((att: any, idx: number) => (
                  <div 
                    key={att.id || idx}
                    onClick={() => {
                      setIsAttendeesOpen(false);
                      if (att.startups?.id) navigate(`/startups/${att.startups.id}`);
                    }}
                    className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={att.startups?.logo_url} />
                      <AvatarFallback className="bg-accent/20 text-accent font-bold">
                        {att.startups?.name?.substring(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-accent transition-colors">
                        {att.startups?.name || "Unknown Startup"}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                        {att.status || "Registered"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No attendees found for upcoming events.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
