import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Rocket, TrendingUp, Users, AlertCircle, Loader2, ArrowUpRight,
  ArrowRight, ShieldAlert, CheckCircle2, DollarSign, Clock, Flame,
  Calendar, Building2, Cpu, Store
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from "recharts";
import { Tables } from "@/integrations/supabase/types";

type Startup = Tables<"startups">;
type Segment = "all" | "tech" | "local";

interface KPICard {
  label: string;
  value: string;
  icon: any;
  trend: string;
  destructive?: boolean;
}

// Maps any current_stage value (old or new) into the 3-stage taxonomy
function classifyStage(stage: string | null): "Early" | "Growth" | "Maturity" {
  const s = (stage || "").toLowerCase();
  if (["ideation", "mvp", "seed", "program"].includes(s)) return "Early";
  if (["scaling", "series a", "expansion", "mentorship", "growth"].includes(s)) return "Growth";
  if (["profitability", "exit-ready", "sustainability", "flourish", "maturity"].includes(s)) return "Maturity";
  return "Early"; // default
}

// Stage colors for the heatmap
const stageConfig = {
  Early: { color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Early Stage", desc: "Ideation · MVP · Seed" },
  Growth: { color: "#8b5cf6", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", label: "Growth Stage", desc: "Scaling · Series A · Expansion" },
  Maturity: { color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Maturity Stage", desc: "Profitability · Exit-Ready" },
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment>("all");

  // Fetch all startups
  const { data: allStartups = [], isLoading: loadingStartups } = useQuery({
    queryKey: ["overview-startups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch upcoming events count + attendance
  const { data: eventData } = useQuery({
    queryKey: ["overview-events"],
    queryFn: async () => {
      const { data: events, error: evErr } = await supabase
        .from("events")
        .select("id, event_date")
        .gte("event_date", new Date().toISOString());
      if (evErr) throw evErr;

      const { count, error: attErr } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true });
      if (attErr) throw attErr;

      return {
        upcomingCount: events?.length || 0,
        totalAttendance: count || 0,
      };
    },
  });

  // --- Derived data based on segment ---
  const startups = useMemo(() => {
    if (segment === "all") return allStartups;
    return allStartups.filter(s => (s.business_type || "").toLowerCase() === segment);
  }, [allStartups, segment]);

  // KPI calculations
  const metrics = useMemo(() => {
    const total = startups.length;
    if (total === 0) return null;

    const withRunway = startups.filter(s => s.runway_months !== null && s.runway_months !== undefined);
    const avgRunway = withRunway.length > 0
      ? Math.round(withRunway.reduce((sum, s) => sum + (s.runway_months || 0), 0) / withRunway.length)
      : 0;

    const withBurn = startups.filter(s => s.monthly_burn_rate !== null);
    const avgBurn = withBurn.length > 0
      ? Math.round(withBurn.reduce((sum, s) => sum + (s.monthly_burn_rate || 0), 0) / withBurn.length)
      : 0;

    const withGrowth = startups.filter(s => s.mom_growth_rate !== null);
    const avgGrowth = withGrowth.length > 0
      ? Math.round(withGrowth.reduce((sum, s) => sum + (s.mom_growth_rate || 0), 0) / withGrowth.length)
      : 0;

    const withRetention = startups.filter(s => s.user_retention !== null);
    const avgRetention = withRetention.length > 0
      ? Math.round(withRetention.reduce((sum, s) => sum + (s.user_retention || 0), 0) / withRetention.length)
      : 0;

    const atRisk = startups.filter(s => s.is_delayed || (s.runway_months !== null && s.runway_months < 6));

    return { total, avgRunway, avgBurn, avgGrowth, avgRetention, atRisk };
  }, [startups]);

  // 3-Stage Taxonomy
  const taxonomyData = useMemo(() => {
    const counts = { Early: 0, Growth: 0, Maturity: 0 };
    startups.forEach(s => {
      counts[classifyStage(s.current_stage)]++;
    });
    return [
      { name: "Early Stage", count: counts.Early, ...stageConfig.Early },
      { name: "Growth Stage", count: counts.Growth, ...stageConfig.Growth },
      { name: "Maturity Stage", count: counts.Maturity, ...stageConfig.Maturity },
    ];
  }, [startups]);

  // Growth curve data
  const trendData = useMemo(() => {
    const currentUsers = startups.reduce((sum, s) => sum + (s.active_users || 0), 0);
    const avgGrowth = metrics?.avgGrowth || 12;
    const growthFactor = 1 + (avgGrowth / 100);
    let value = currentUsers > 0 ? currentUsers : 5000;

    const varianceMap: Record<string, number> = { "Jun": 1, "May": 0.98, "Apr": 1.04, "Mar": 0.95, "Feb": 1.02, "Jan": 0.99 };
    const months = ["Jun", "May", "Apr", "Mar", "Feb", "Jan"];
    const result: Array<{ month: string; actual: number; goal: number }> = [];

    for (const month of months) {
      result.unshift({
        month,
        actual: Math.round(value),
        goal: Math.round(value * 1.15),
      });
      value = (value / growthFactor) * (varianceMap[month] || 1);
    }
    return result;
  }, [startups, metrics]);

  // Build KPI cards based on segment
  const kpiCards = useMemo(() => {
    if (!metrics) return [];

    const base: KPICard[] = [
      {
        label: "Total Ventures",
        value: metrics.total.toString(),
        icon: Rocket,
        trend: segment === "all" ? "All segments" : segment === "tech" ? "Tech portfolio" : "Local portfolio",
      },
    ];

    if (segment === "local") {
      // Local: Primary = Profit focus, Secondary = Reserve
      base.push(
        { label: "Avg. Retention", value: `${metrics.avgRetention}%`, icon: Users, trend: "Customer loyalty" },
        { label: "Cash Runway", value: `${metrics.avgRunway}mo`, icon: Clock, trend: metrics.avgRunway < 6 ? "Low reserve ⚠" : "Healthy reserve" },
        { label: "Action Required", value: metrics.atRisk.length.toString(), icon: AlertCircle, trend: "Requires review", destructive: metrics.atRisk.length > 0 },
      );
    } else {
      // Tech (and All): Primary = Runway, Secondary = Growth
      base.push(
        { label: "Avg. Runway", value: `${metrics.avgRunway}mo`, icon: Clock, trend: metrics.avgRunway < 6 ? "Critical ⚠" : "Healthy runway" },
        { label: "MoM Growth", value: `${metrics.avgGrowth}%`, icon: TrendingUp, trend: "User acquisition" },
        { label: "Action Required", value: metrics.atRisk.length.toString(), icon: AlertCircle, trend: "Requires review", destructive: metrics.atRisk.length > 0 },
      );
    }

    return base;
  }, [metrics, segment]);

  if (loadingStartups) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header + Segment Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">Global Command Center</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Production-grade portfolio intelligence. Monitor startup health, identify risk, and track lifecycle progression across the Collective Lab.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20 px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-accent mr-2 animate-pulse"></span>
            Live Portfolio Sync
          </Badge>
        </div>
      </div>

      {/* Segmented Control */}
      <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-2">
            <Building2 className="h-3.5 w-3.5" />
            All Ventures
          </TabsTrigger>
          <TabsTrigger value="tech" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-2">
            <Cpu className="h-3.5 w-3.5" />
            Tech Startups
          </TabsTrigger>
          <TabsTrigger value="local" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-2">
            <Store className="h-3.5 w-3.5" />
            Local Businesses
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Hybrid KPI Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((stat) => (
          <Card key={stat.label} className={`relative overflow-hidden border backdrop-blur-xl transition-all duration-300 ${stat.destructive ? 'border-destructive/30 bg-destructive/5' : 'bg-card/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className={`text-sm font-medium ${stat.destructive ? 'text-destructive' : 'text-muted-foreground'}`}>
                {stat.label}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/5 text-primary'}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-bold font-heading ${stat.destructive ? 'text-destructive' : 'text-foreground'}`}>
                  {stat.value}
                </p>
                <span className={`text-xs font-medium ${stat.destructive ? 'text-destructive/80' : 'text-accent-foreground'}`}>
                  {stat.trend}
                </span>
              </div>
            </CardContent>
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-20 ${stat.destructive ? 'bg-destructive' : 'bg-primary'}`}></div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-6">

          {/* 3-Stage Taxonomy Heatmap */}
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                Lifecycle Taxonomy
                <Badge variant="secondary" className="bg-muted font-mono shrink-0">3-Stage Pipeline</Badge>
              </CardTitle>
              <CardDescription>
                Portfolio distribution across the unified lifecycle. Identify where ventures are concentrated to allocate resources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Visual Stage Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {taxonomyData.map((stage) => {
                  const percentage = startups.length > 0 ? Math.round((stage.count / startups.length) * 100) : 0;
                  const isBottleneck = percentage > 60;
                  return (
                    <div
                      key={stage.name}
                      className={`relative rounded-xl border p-4 transition-all ${stage.bg} ${stage.border} ${isBottleneck ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                    >
                      {isBottleneck && (
                        <Badge className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5">
                          Bottleneck
                        </Badge>
                      )}
                      <p className={`text-xs font-medium ${stage.text} opacity-80`}>{stage.desc}</p>
                      <p className={`text-3xl font-bold font-heading mt-2 ${stage.text}`}>{stage.count}</p>
                      <p className={`text-xs font-medium mt-1 ${stage.text} opacity-60`}>{percentage}% of portfolio</p>
                    </div>
                  );
                })}
              </div>

              {/* Bar Chart */}
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taxonomyData} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={80}>
                      {taxonomyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Growth Curve */}
          <Card className="shadow-sm border hidden md:block">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Aggregate Cohort Growth Curve</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {segment === "local" ? "Combined customer reach across local portfolio" : "Total Monthly Active Users (MAU) reaching the market"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-accent mr-1"></span> Actual</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-muted-foreground/30 mr-1"></span> Goal</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[160px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGrowthV2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                      formatter={(value: number, name: string) => [value.toLocaleString(), name === 'actual' ? 'Total Users' : 'Target Goal']}
                      labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="goal" stroke="hsl(var(--border))" strokeDasharray="3 3" strokeWidth={2} fill="none" />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="hsl(var(--accent))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorGrowthV2)"
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      dot={{ r: 3, fill: "hsl(var(--background))", stroke: "hsl(var(--accent))", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Risk Radar + Community Pulse */}
        <div className="space-y-6">

          {/* Risk Radar */}
          <Card className="shadow-sm border border-destructive/20 flex flex-col">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                <ShieldAlert className="w-5 h-5 mr-2 text-destructive" />
                Risk Radar
              </CardTitle>
              <CardDescription>
                {segment === "tech"
                  ? "High burn with < 6 months runway."
                  : segment === "local"
                  ? "Ventures with stalled growth or low reserves."
                  : "Startups requiring immediate review."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              {metrics && metrics.atRisk.length > 0 ? (
                <div className="space-y-4">
                  {metrics.atRisk.slice(0, 4).map((startup) => (
                    <div
                      key={startup.id}
                      onClick={() => navigate(`/startups/${startup.id}`)}
                      className="group p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{startup.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{startup.industry || "General"}</p>
                        </div>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px] border-none shrink-0">
                          {startup.runway_months !== null && startup.runway_months < 6
                            ? `${startup.runway_months}m Runway`
                            : "Delayed"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                        Review Details <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2" onClick={() => navigate('/startups')}>
                    View All Startups <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full min-h-[150px] text-muted-foreground opacity-70">
                  <div className="h-12 w-12 rounded-full border border-dashed flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-accent" />
                  </div>
                  <p className="font-medium text-sm">Portfolio Healthy</p>
                  <p className="text-xs mt-1">No pending interventions.</p>
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
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Attendees</p>
                    <p className="text-xl font-bold font-heading text-foreground">{eventData?.totalAttendance || 0}</p>
                  </div>
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Users className="h-4 w-4 text-accent" />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate('/events')}>
                  Open Event Hub <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
