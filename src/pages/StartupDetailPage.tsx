import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Upload, FileText, Loader2, Send, Target, Zap, Rocket, LineChart, Users, Megaphone, CheckCircle2, Calendar, Download, Crosshair, Flame } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
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
import { Tables } from "@/integrations/supabase/types";

const industryColors: Record<string, string> = {
  FinTech: "bg-blue-50 text-blue-700 border-blue-200",
  HealthTech: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CleanTech: "bg-green-50 text-green-700 border-green-200",
  EdTech: "bg-amber-50 text-amber-700 border-amber-200",
  "AI / ML": "bg-violet-50 text-violet-700 border-violet-200",
};

const DOCUMENT_BUCKET = "test-vault";

const getDocumentStoragePath = (storedPath: string) => {
  if (!storedPath.startsWith("http")) return storedPath;
  const bucketPathMarker = `/${DOCUMENT_BUCKET}/`;
  const markerIndex = storedPath.indexOf(bucketPathMarker);
  if (markerIndex === -1) return storedPath;
  return decodeURIComponent(storedPath.slice(markerIndex + bucketPathMarker.length));
};

export default function StartupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Queries
  const { data: startup, isLoading } = useQuery({
    queryKey: ["startup", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("milestones").select("*").eq("startup_id", id!).order("achieved_at", { ascending: false });
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

  const { data: financials = [] } = useQuery({
    queryKey: ["financials", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("startup_financials").select("*").eq("startup_id", id!).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["targets", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("startup_targets").select("*").eq("startup_id", id!).order("created_at", { ascending: true });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/startups")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Startup not found.</p>
      </div>
    );
  }

  // Helper variables to simulate document checks (for Financials and Team)
  const hasHistoricalFinancials = documents.some(d => d.file_name.toLowerCase().includes("historical financials"));
  const hasFinancialModel = documents.some(d => d.file_name.toLowerCase().includes("financial model"));
  const financialsFilled = [hasHistoricalFinancials, hasFinancialModel].filter(Boolean).length;

  const hasTeamBios = documents.some(d => d.file_name.toLowerCase().includes("team bio"));
  const hasOrgStructure = documents.some(d => d.file_name.toLowerCase().includes("organizational structure"));
  const teamFilled = [hasTeamBios, hasOrgStructure].filter(Boolean).length;

  // New logic for Company Profile progress bars
  const missionVisionFilled = [startup.mission_statement, startup.vision_statement].filter(Boolean).length;
  const missionVisionProgress = (missionVisionFilled / 2) * 100;

  const problemValPropFilled = [startup.problem_statement, startup.value_proposition, startup.target_market, startup.solution_description].filter(Boolean).length;
  const problemValPropProgress = (problemValPropFilled / 4) * 100;

  const roadmapFilled = [startup.strategic_goals, startup.key_results, startup.roadmap_text].filter(Boolean).length;
  const roadmapProgress = (roadmapFilled / 3) * 100;


  // Maps any current_stage value into the 3-stage taxonomy
  const classifyStage = (stage: string | null): GrowthStage => {
    const s = (stage || "").toLowerCase();
    if (["ideation", "mvp", "seed", "program"].includes(s)) return "Early";
    if (["scaling", "series a", "expansion", "mentorship", "growth"].includes(s)) return "Growth";
    if (["profitability", "exit-ready", "sustainability", "flourish", "maturity"].includes(s)) return "Maturity";
    return "Early";
  };

  const isAtRisk = startup.is_delayed || (startup.runway_months !== null && (startup.runway_months ?? 0) < 6);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/startups")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Startups
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight font-heading">{startup.name}</h1>
            <p className="text-sm text-primary mt-1 font-medium">Founded by {startup.founder_name}</p>
          </div>
          <GrowthStageBar 
            currentStage={classifyStage(startup.current_stage)} 
            isDelayed={isAtRisk} 
          />
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 bg-transparent justify-start border-b border-border w-full rounded-none h-auto p-0 space-x-6 overflow-x-auto">
          <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><LayoutIcon className="w-4 h-4 mr-2" /> Overview</TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><Target className="w-4 h-4 mr-2" /> Company Profile</TabsTrigger>
          <TabsTrigger value="financials" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><LineChart className="w-4 h-4 mr-2" /> Financials</TabsTrigger>
          <TabsTrigger value="targets" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><Crosshair className="w-4 h-4 mr-2" /> Targets</TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><Calendar className="w-4 h-4 mr-2" /> Events</TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><Users className="w-4 h-4 mr-2" /> Team & Operations</TabsTrigger>
          <TabsTrigger value="updates" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><Megaphone className="w-4 h-4 mr-2" /> Updates</TabsTrigger>
          <TabsTrigger value="vault" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><FileText className="w-4 h-4 mr-2" /> Document Vault</TabsTrigger>
        </TabsList>

        {/* 1. Overview Tab */}
        <TabsContent value="overview" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Industry</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className={industryColors[startup.industry ?? ""] ?? "bg-blue-50 text-blue-700"}>
                  {startup.industry ?? "—"}
                </Badge>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-heading">{startup.active_users?.toLocaleString() ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">MoM Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-heading text-accent">+{startup.mom_growth_rate ?? 0}%</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-heading">{startup.user_retention ?? 0}%</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">LTV:CAC Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-heading">{startup.ltv_cac_ratio ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Burn</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-heading">${startup.monthly_burn_rate?.toLocaleString() ?? 0}</p>
              </CardContent>
            </Card>
            <Card className={`shadow-sm ${startup.runway_months && startup.runway_months < 6 ? "border-destructive/50 bg-destructive/5" : ""}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Runway</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold font-heading ${startup.runway_months && startup.runway_months < 6 ? "text-destructive" : ""}`}>
                  {startup.runway_months ?? 0} {startup.runway_months === 1 ? "month" : "months"}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-accent/20 bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-accent flex items-center">
                  <Flame className="h-3.5 w-3.5 mr-1" />
                  {startup.north_star_metric_name || "North Star"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-heading text-foreground">
                  {startup.north_star_metric_value?.toLocaleString() ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm border">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base font-semibold">Activity Stream</CardTitle>
                <CardDescription>Major milestones and stage transitions.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {milestones.length === 0 ? (
                  <div className="text-center py-6">
                    <Rocket className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {milestones.map((m) => (
                      <div key={m.id} className="border-l-2 border-primary/20 pl-4 py-1 relative before:absolute before:-left-[5px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-primary">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Transitioned to <span className="text-primary">{m.stage_reached}</span></p>
                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(m.achieved_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Company Profile Tab */}
        <TabsContent value="profile" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-4xl space-y-8">
            {/* Mission & Vision */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-heading font-semibold text-foreground">Mission And Vision</h3>
                  <p className="text-sm text-muted-foreground">Describe your startup's core purpose, long-term goals, and aspirations.</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-primary">{missionVisionFilled} / 2</span>
                </div>
              </div>
              <Progress value={missionVisionProgress} className="h-2" />
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <Card className={`shadow-sm ${startup.mission_statement ? 'border-primary/20 bg-primary/5' : 'bg-muted/10 border-dashed'}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Mission Statement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {startup.mission_statement ? (
                      <p className="text-sm text-foreground">{startup.mission_statement}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground pt-4 pb-4 text-center">Mission statement awaits input...</p>
                    )}
                  </CardContent>
                </Card>
                <Card className={`shadow-sm ${startup.vision_statement ? 'border-primary/20 bg-primary/5' : 'bg-muted/10 border-dashed'}`}>
                   <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Vision Statement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {startup.vision_statement ? (
                      <p className="text-sm text-foreground">{startup.vision_statement}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground pt-4 pb-4 text-center">Vision statement awaits input...</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Problem & Value Prop */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-heading font-semibold text-foreground">Problem and Value Proposition</h3>
                  <p className="text-sm text-muted-foreground">Explain the problem you're solving, the value proposition, and the target market.</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-primary">{problemValPropFilled} / 4</span>
                </div>
              </div>
              <Progress value={problemValPropProgress} className="h-2" />
              <div className={`p-6 mt-6 rounded-lg ${startup.problem_statement || startup.value_proposition ? 'border bg-card shadow-sm' : 'border border-dashed bg-muted/5 flex items-center justify-center min-h-[100px]'}`}>
                {startup.problem_statement || startup.value_proposition ? (
                  <div className="space-y-4">
                    {startup.problem_statement && <div><h4 className="text-sm font-semibold mb-1">The Problem</h4><p className="text-sm text-muted-foreground">{startup.problem_statement}</p></div>}
                    {startup.value_proposition && <div><h4 className="text-sm font-semibold mb-1">Value Proposition</h4><p className="text-sm text-muted-foreground">{startup.value_proposition}</p></div>}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Problem & Value Proposition section is currently empty.</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Roadmap */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-heading font-semibold text-foreground">Strategic Objectives and Roadmap</h3>
                  <p className="text-sm text-muted-foreground">Outline your strategic goals, key results, and major milestones.</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-primary">{roadmapFilled} / 3</span>
                </div>
              </div>
              <Progress value={roadmapProgress} className="h-2" />
              
              <div className="grid gap-4 mt-6">
                 <Card className={`shadow-sm ${startup.strategic_goals ? 'border-primary/20 bg-primary/5' : 'bg-muted/10 border-dashed'}`}>
                   <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Strategic Goals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {startup.strategic_goals ? (
                      <p className="text-sm text-foreground">{startup.strategic_goals}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground pt-4 pb-4 text-center">No strategic goals defined yet...</p>
                    )}
                  </CardContent>
                </Card>

                 <div className="grid md:grid-cols-2 gap-4">
                    <Card className={`shadow-sm ${startup.key_results ? 'border-primary/20 bg-primary/5' : 'bg-muted/10 border-dashed'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Key Results (OKRs)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {startup.key_results ? (
                          <p className="text-sm text-foreground whitespace-pre-wrap">{startup.key_results}</p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground pt-4 pb-4 text-center">Awaiting key results...</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className={`shadow-sm ${startup.roadmap_text ? 'border-primary/20 bg-primary/5' : 'bg-muted/10 border-dashed'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Roadmap Narrative</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {startup.roadmap_text ? (
                          <p className="text-sm text-foreground">{startup.roadmap_text}</p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground pt-4 pb-4 text-center">Roadmap journey awaits input...</p>
                        )}
                      </CardContent>
                    </Card>
                 </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. Financials Tab */}
        <TabsContent value="financials" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-heading font-semibold text-foreground">Profit & Loss Performance</h3>
                <p className="text-sm text-muted-foreground">Historical revenue vs. expenses tracking.</p>
              </div>
            </div>
            {financials.length === 0 ? (
              <div className="p-12 border border-dashed rounded-xl bg-muted/5 flex flex-col items-center justify-center text-center">
                <LineChart className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No financial data available</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">Awaiting founder input for monthly revenue and expenses.</p>
              </div>
            ) : (
              <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">P&L Trend</CardTitle>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span> Revenue</span>
                      <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-destructive mr-1"></span> Expenses</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full mt-4">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={financials} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `$${value/1000}k`} />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                          <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 3.1 Targets Tab */}
        <TabsContent value="targets" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-heading font-semibold text-foreground">Monthly Targets & Objectives</h3>
                <p className="text-sm text-muted-foreground">Track startup performance against declared goals.</p>
              </div>
            </div>
            {targets.length === 0 ? (
              <div className="p-12 border border-dashed rounded-xl bg-muted/5 flex flex-col items-center justify-center text-center">
                <Target className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No targets set</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">Awaiting founder to declare monthly objectives.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {targets.map((t: Tables<"startup_targets">) => (
                  <Card key={t.id} className="shadow-sm border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">{t.month}</p>
                        <p className="font-medium text-sm text-foreground">{t.objective}</p>
                        <p className="text-sm font-semibold text-primary mt-1">Goal: {t.target_value}</p>
                      </div>
                      <Badge variant={t.status === 'Achieved' ? 'default' : t.status === 'At Risk' ? 'destructive' : 'secondary'} className={t.status === 'On Track' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}>
                        {t.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3.2 Events Tab */}
        <TabsContent value="events" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-heading font-semibold text-foreground">Event Attendance</h3>
                <p className="text-sm text-muted-foreground">Lab events this startup is participating in.</p>
              </div>
            </div>
            {attendance.length === 0 ? (
              <div className="p-12 border border-dashed rounded-xl bg-muted/5 flex flex-col items-center justify-center text-center">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attendance.map((a: any) => (
                  <Card key={a.id} className="shadow-sm border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="bg-primary/10 rounded-lg p-3 flex flex-col items-center justify-center min-w-[60px]">
                        <span className="text-xs font-bold text-primary uppercase">{new Date(a.events?.event_date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-foreground">{new Date(a.events?.event_date).getDate()}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-base">{a.events?.title}</h4>
                        <p className="text-sm text-muted-foreground">{a.events?.location}</p>
                        <Badge variant="outline" className="mt-2 text-xs border-emerald-500 text-emerald-600 bg-emerald-50">{a.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 4. Team & Operations Tab */}
        <TabsContent value="team" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-4xl space-y-8">
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-heading font-semibold text-primary">Team & Operations</h3>
                  <p className="text-sm text-muted-foreground max-w-2xl">The Team & Operations section highlights key team members, company structure, and hiring plans.</p>
                </div>
              </div>
              <div className="mt-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">{Math.round((teamFilled / 2) * 100)}% Overall Progress</span>
                  <span className="text-muted-foreground">{teamFilled} of 2 documents uploaded</span>
                </div>
                <Progress value={(teamFilled / 2) * 100} className="h-3" />
              </div>
            </div>

            <div className="grid gap-6">
              <Card className={`shadow-sm ${hasTeamBios ? 'border-accent bg-accent/5' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Founders / Team Bios (Leadership)</CardTitle>
                    {hasTeamBios && <CheckCircle2 className="h-5 w-5 text-accent" />}
                  </div>
                  <CardDescription>Key founders, their backgrounds, and roles.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {!hasTeamBios && (
                    <p className="text-sm italic text-muted-foreground">Awaiting founder input...</p>
                  )}
                </CardContent>
              </Card>

              <Card className={`shadow-sm ${hasOrgStructure ? 'border-accent bg-accent/5' : ''}`}>
                <CardHeader className="pb-2">
                   <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Organizational Structure (Company Framework)</CardTitle>
                    {hasOrgStructure && <CheckCircle2 className="h-5 w-5 text-accent" />}
                  </div>
                  <CardDescription>Company structure and team hierarchy.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {!hasOrgStructure && (
                    <p className="text-sm italic text-muted-foreground">Awaiting founder input...</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 5. Updates (Newsletter) Tab */}
        <TabsContent value="updates" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-2xl">
            <div className="mb-8">
              <h3 className="text-2xl font-heading font-semibold text-foreground">Achievements & Updates</h3>
              <p className="text-sm text-muted-foreground mt-2">Keep your investors and team updated with your latest wins, product launches, and milestones.</p>
            </div>

            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              
              {/* Mock Update 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-accent text-accent-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border shadow-sm p-5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg text-foreground">✨ Company Highlights</h4>
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">Tue, 14 Apr</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">This month, we’ve made incredible progress across the board. The platform is becoming investment-ready and our active users are heavily engaged with the new features.</p>
                </div>
              </div>

               {/* Mock Update 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mt-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Rocket className="h-4 w-4 text-white" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border shadow-sm p-5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg text-foreground">Initial MVP Launched</h4>
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">Fri, 20 Mar</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Our beta launch was a success. We handled initial capacity well and received top-tier feedback from early adopters.</p>
                </div>
              </div>

            </div>
          </div>
        </TabsContent>

        {/* 6. Document Vault Tab */}
        <TabsContent value="vault" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid gap-6 md:grid-cols-2 mt-4">
            <div>
              <h3 className="text-lg font-heading font-semibold mb-4 text-foreground">Required Documents</h3>
              <div className="space-y-4">
                {[
                  { name: "Pitch Deck (The Big Idea)", desc: "Problem, Solution, Market, Ask", focus: "Does it make sense?" },
                  { name: "Product Roadmap", desc: "MVP timeline and big launch", focus: "Can they build it?" },
                  { name: "Founder Bio & Cap Table", desc: "Team ownership split", focus: "Fair ownership?" },
                  { name: "Legal & KYC", desc: "CAC, Tax ID, Government IDs", focus: "Is it legal?" },
                  { name: "Term Sheet / MOU", desc: "Valuation and decision rules", focus: "Fair deal?" },
                  { name: "Financial Model", desc: "Burn rate and profitability projection", focus: "Will they run out of money?" },
                ].map((doc, idx) => {
                  const isUploaded = documents.some(d => d.file_name.toLowerCase().includes(doc.name.split(" ")[0].toLowerCase()));
                  return (
                    <Card key={idx} className={`shadow-sm ${isUploaded ? "border-accent/50 bg-accent/5" : ""}`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm font-semibold text-foreground">{doc.name}</CardTitle>
                          {isUploaded && <Badge className="bg-accent text-accent-foreground text-[10px] hover:bg-accent border-none rounded">Verified</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground mb-1">{doc.desc}</p>
                        <p className="text-xs font-medium text-primary">Lab Focus: <span className="font-normal text-muted-foreground">{doc.focus}</span></p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">


              {documents.length === 0 ? (
               <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed">
                 <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                 <p className="text-sm font-medium text-foreground">No documents uploaded yet.</p>
                 <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">Waiting for founder to securely upload documents.</p>
               </div>
              ) : (
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vault Contents</h4>
                  {documents.map((doc) => (
                    <button key={doc.id} type="button" onClick={async () => {
                         const filePath = getDocumentStoragePath(doc.file_url);
                        const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(filePath, 60);
                        if (error || !data?.signedUrl) {
                          toast({ title: "Failed to open file", description: error?.message ?? "Unknown error", variant: "destructive" });
                          return;
                        }
                        window.open(data.signedUrl, "_blank");
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-all hover:bg-primary/5 hover:border-primary/20 group shadow-sm"
                    >
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Simple Layout icon placeholder
function LayoutIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="9" x2="9" y1="21" y2="9" />
    </svg>
  );
}
