import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Upload, FileText, Loader2, Send, Target, Zap, Rocket, LineChart, Users, Megaphone, CheckCircle2, Calendar, Download, Crosshair, Flame, MessageSquare, ArrowUpRight, ArrowDownRight, AlertCircle, Plus, LayoutDashboard, Filter, MoreVertical, TrendingUp, TrendingDown, Calculator, Globe, Sparkles, Shield, ShieldCheck, Wallet, Activity, Linkedin, UserPlus, Workflow, Building2, Users2, Briefcase, ExternalLink } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart as RechartsLineChart, Line } from "recharts";
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
import { Slider } from "@/components/ui/slider";
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

// --- MOCK DATA FOR OVERVIEW DASHBOARD ---
const revenueData = [
  { month: 'Jan', mrr: 42000, arr_target: 500000 },
  { month: 'Feb', mrr: 45000, arr_target: 550000 },
  { month: 'Mar', mrr: 48500, arr_target: 600000 },
  { month: 'Apr', mrr: 51000, arr_target: 650000 },
  { month: 'May', mrr: 58000, arr_target: 700000 },
  { month: 'Jun', mrr: 64000, arr_target: 750000 },
  { month: 'Jul', mrr: 72000, arr_target: 800000 },
  { month: 'Aug', mrr: 105000, arr_target: 900000 },
  { month: 'Sep', mrr: 112000, arr_target: 1000000 },
  { month: 'Oct', mrr: 108000, arr_target: 1100000 },
  { month: 'Nov', mrr: 118000, arr_target: 1200000 },
  { month: 'Dec', mrr: 127400, arr_target: 1500000 },
];

const userGrowthData = [
  { month: 'Jul', new: 400, churned: 50 },
  { month: 'Aug', new: 850, churned: 120 },
  { month: 'Sep', new: 600, churned: 180 },
  { month: 'Oct', new: 300, churned: 450 },
  { month: 'Nov', new: 750, churned: 200 },
  { month: 'Dec', new: 940, churned: 110 },
];

const mockProfile = {
  name: "PayStacker",
  logo: "🚀",
  industry: "FinTech / Payments",
  stage: "Seed",
  elevatorPitch: "We are building the unified API for cross-border payroll in emerging markets.",
  mission: "To eliminate the friction of global compensation so companies can hire the best talent anywhere.",
  problem: "Companies lose 4-6% in FX fees and spend weeks managing compliance when paying contractors across Africa and LATAM.",
  solution: "A single API that handles FX routing, local tax compliance, and instant payouts to local bank accounts or mobile money.",
  market: {
    tam: "$4.2B",
    sam: "$1.1B",
    som: "$150M"
  },
  moat: "Direct integration with 14 central banks, bypassing SWIFT entirely.",
  team: [
    { id: 1, name: "Chidi Okonkwo", role: "CEO & Founder", superpower: "Ex-Stripe Product", avatar: "https://i.pravatar.cc/150?u=chidi" },
    { id: 2, name: "Sarah Jenkins", role: "CTO", superpower: "Distributed Systems", avatar: "https://i.pravatar.cc/150?u=sarah" },
    { id: 3, name: "Tunde Alabi", role: "Head of Operations", superpower: "Compliance Guru", avatar: "https://i.pravatar.cc/150?u=tunde" },
  ]
};

const historicalPnL = [
  { month: 'May', revenue: 28000, expenses: 65000 },
  { month: 'Jun', revenue: 32000, expenses: 68000 },
  { month: 'Jul', revenue: 35000, expenses: 70000 },
  { month: 'Aug', revenue: 41000, expenses: 75000 },
  { month: 'Sep', revenue: 45000, expenses: 76000 },
  { month: 'Oct', revenue: 50000, expenses: 80000 },
];

const burnBreakdown = [
  { name: 'Salaries', value: 55000, color: '#635BFF' },
  { name: 'Infrastructure', value: 12000, color: '#00D395' },
  { name: 'Marketing', value: 18000, color: '#F5A623' },
  { name: 'Operations', value: 6000, color: '#FF4D4F' },
];

const SparkLine = ({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) => (
  <ResponsiveContainer width="100%" height={40}>
    <RechartsLineChart data={data}>
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
    </RechartsLineChart>
  </ResponsiveContainer>
);

const ProgressRing = ({ progress, size = 60, strokeWidth = 5, color = "#635BFF" }: { progress: number, size?: number, strokeWidth?: number, color?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-500 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white">{progress}%</span>
    </div>
  );
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

  const { data: pulses = [] } = useQuery({
    queryKey: ["startup-pulses", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pulses").select("*").eq("startup_id", id!).order("month", { ascending: true });
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

  const { data: startupUpdates = [] } = useQuery({
    queryKey: ["startup-updates", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("startup_updates").select("*").eq("startup_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*, profiles(email)").eq("startup_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const [noteText, setNoteText] = useState("");

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notes").insert({
        content: noteText,
        startup_id: id!,
        author_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", id] });
      setNoteText("");
    },
    onError: (error: any) => {
      toast({ title: "Error adding note", description: error.message, variant: "destructive" });
    },
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

  // Derive KPIs from live pulses
  const latestPulse = pulses.length > 0 ? pulses[pulses.length - 1] : null;
  const previousPulse = pulses.length > 1 ? pulses[pulses.length - 2] : null;

  const currentMrr = latestPulse?.mrr || 0;
  const prevMrr = previousPulse?.mrr || 0;
  const mrrGrowth = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr) * 100 : 0;

  const currentCash = latestPulse?.cash_in_bank || 0;
  const currentBurn = latestPulse?.expenses || 0;
  const runwayMonths = currentBurn > 0 ? (currentCash / currentBurn).toFixed(1) : "∞";

  const chartData = pulses.map(p => ({
    month: p.month.split('-')[1], // Just the month part for the X-axis
    mrr: p.mrr,
    expenses: p.expenses,
    revenue: p.mrr, // Mapping for revenue charts
    new: p.new_users,
    churned: p.lost_users
  }));

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
          <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><MessageSquare className="w-4 h-4 mr-2" /> Notes</TabsTrigger>
          <TabsTrigger value="vault" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"><FileText className="w-4 h-4 mr-2" /> Document Vault</TabsTrigger>
        </TabsList>

        {/* 1. Overview Tab */}
        <TabsContent value="overview" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 bg-[#0f0f0f] p-6 rounded-xl border border-white/10">
            {/* LEFT COLUMN: KPI Strip + Main Charts */}
            <div className="xl:col-span-8 space-y-6">
              
              {/* ZONE 1: KPI STRIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-[#1a1a1a] border-white/5 shadow-md rounded-xl">
                  <CardContent className="p-5">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Monthly Recurring Rev</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-bold text-white tabular-nums tracking-tight">
                        ${(currentMrr / 1000).toFixed(1)}k
                      </h3>
                      <div className={`flex items-center text-sm font-medium ${mrrGrowth >= 0 ? 'text-[#00D395]' : 'text-[#FF4D4F]'}`}>
                        {mrrGrowth >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1 stroke-[3px]" /> : <ArrowDownRight className="h-4 w-4 mr-1 stroke-[3px]" />}
                        {Math.abs(mrrGrowth).toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-4"><SparkLine data={chartData} dataKey="mrr" color="#635BFF" /></div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/5 shadow-md rounded-xl">
                  <CardContent className="p-5">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Cash Runway</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-bold text-white tabular-nums tracking-tight">{runwayMonths} <span className="text-lg text-gray-400 font-medium">mo</span></h3>
                      <Badge variant="outline" className={`border-none ${parseFloat(runwayMonths) >= 12 ? 'text-[#00D395] bg-[#00D395]/10' : 'text-[#FF4D4F] bg-[#FF4D4F]/10'}`}>
                        {parseFloat(runwayMonths) >= 12 ? 'Healthy' : 'Low Runway'}
                      </Badge>
                    </div>
                    <div className="mt-6 space-y-2">
                      <Progress value={(Math.min(parseFloat(runwayMonths), 24) / 24) * 100} className="h-2 bg-gray-800 [&>div]:bg-[#00D395]" />
                      <p className="text-xs text-gray-500 text-right font-medium">Target: &gt;18 mo</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/5 shadow-md rounded-xl">
                  <CardContent className="p-5">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Net Burn Rate</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-bold text-white tabular-nums tracking-tight">$91.0k</h3>
                      <div className="flex items-center text-[#FF4D4F] text-sm font-medium">
                        <ArrowUpRight className="h-4 w-4 mr-1 stroke-[3px]" /> 4.1%
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-4 pt-4 border-t border-white/5">Burn increased due to Q3 spend.</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/5 shadow-md rounded-xl">
                  <CardContent className="p-5">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Active Users (WAU)</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-bold text-white tabular-nums tracking-tight">3,840</h3>
                      <div className="flex items-center text-[#00D395] text-sm font-medium">
                        <ArrowUpRight className="h-4 w-4 mr-1 stroke-[3px]" /> 12%
                      </div>
                    </div>
                    <div className="mt-4"><SparkLine data={userGrowthData} dataKey="new" color="#00D395" /></div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/5 shadow-md rounded-xl">
                  <CardContent className="p-5">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Logo Churn Rate</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-bold text-white tabular-nums tracking-tight">2.3%</h3>
                      <div className="flex items-center text-[#00D395] text-sm font-medium">
                        <ArrowDownRight className="h-4 w-4 mr-1 stroke-[3px]" /> 0.5%
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-4 pt-4 border-t border-white/5">Improved since October.</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/5 shadow-md rounded-xl flex flex-col justify-between">
                  <CardContent className="p-5 pb-2">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Cash Balance</p>
                    <h3 className="text-4xl font-bold text-white tabular-nums tracking-tight mt-1">$1.27M</h3>
                  </CardContent>
                  <div className="px-5 pb-5">
                    <div className="w-full bg-[#0f0f0f] border border-white/5 rounded-md p-3 flex items-center justify-between">
                      <span className="text-[13px] text-gray-400">Next Payroll:</span>
                      <span className="text-[13px] font-semibold text-white">-$55k in 4d</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ZONE 2: MAIN CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#1a1a1a] border-white/5 shadow-md lg:col-span-2 rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-200">Revenue Trajectory (MRR)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMrrAdmin" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#635BFF" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#635BFF" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="month" stroke="#666" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#666" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} dx={-10} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                          />
                          <Area type="monotone" dataKey="mrr" stroke="#635BFF" strokeWidth={3} fillOpacity={1} fill="url(#colorMrrAdmin)" activeDot={{ r: 6, fill: '#635BFF', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/5 shadow-md rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-200">User Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={userGrowthData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="month" stroke="#666" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#666" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} dx={-10} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                          <Bar dataKey="new" name="New Users" stackId="a" fill="#00D395" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="churned" name="Churned" stackId="a" fill="#FF4D4F" radius={[0, 0, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-white/5 shadow-md rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-200">Burn Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-between h-[220px] mt-4 gap-4">
                      <div className="w-full sm:w-1/2 h-full min-h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={burnBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                              {burnBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full sm:w-1/2 space-y-3">
                        {burnBreakdown.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                              <span className="text-xs text-gray-300">{item.name}</span>
                            </div>
                            <span className="text-xs font-semibold text-white">${(item.value/1000).toFixed(1)}k</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* RIGHT COLUMN: Action Feed */}
            <div className="xl:col-span-4 space-y-6">
              
              <Card className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border-white/10 shadow-xl rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#635BFF] to-[#00D395]"></div>
                <CardHeader className="pb-0 items-center text-center mt-2">
                  <CardTitle className="text-[11px] uppercase tracking-widest font-semibold text-gray-400">Company Health</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center pb-6">
                  <div className="relative w-40 h-40 flex items-center justify-center my-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-xl">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#222" strokeWidth="8" />
                      <circle 
                        cx="50" cy="50" r="45" fill="none" stroke="#00D395" strokeWidth="8" 
                        strokeDasharray={`${(85/100) * 283} 283`} strokeLinecap="round" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold tracking-tighter text-[#00D395]">85</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Score</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#111] border border-white/5 rounded-lg p-3 text-center">
                    <p className="text-[13px] text-gray-400">
                      Weakest pillar: <strong className="text-white font-semibold">Burn Efficiency</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1a] border-white/5 border-t-2 border-t-[#FF4D4F] rounded-xl shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-[#FF4D4F] mr-2" />
                    <CardTitle className="text-sm font-semibold text-white tracking-wide">Critical Alerts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-1.5 p-3.5 bg-[#FF4D4F]/10 rounded-lg border border-[#FF4D4F]/20">
                    <span className="text-[13px] font-semibold text-[#FF4D4F]">Runway Warning</span>
                    <span className="text-[13px] text-gray-300 leading-relaxed">Runway projected to drop below 12 months by Q4. Suggest fundraising discussion.</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1a] border-white/5 shadow-md border">
                <CardHeader className="border-b border-white/5 bg-muted/5">
                  <CardTitle className="text-base font-semibold text-white">Activity Stream</CardTitle>
                  <CardDescription className="text-gray-400">Major milestones and stage transitions.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {milestones.length === 0 ? (
                    <div className="text-center py-6">
                      <Rocket className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No recent activity found.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {milestones.map((m) => (
                        <div key={m.id} className="border-l-2 border-[#635BFF]/30 pl-4 py-1 relative before:absolute before:-left-[5px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-[#635BFF]">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-200">Transitioned to <span className="text-[#635BFF]">{m.stage_reached}</span></p>
                            <span className="text-xs text-gray-500 font-mono">
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
          </div>
        </TabsContent>

        {/* 2. Company Profile Tab */}
        <TabsContent value="profile" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 bg-[#0f0f0f] p-8 rounded-xl border border-white/10">
            
            {/* LEFT COLUMN: Narrative & Team */}
            <div className="xl:col-span-8 space-y-8">
              
              {/* Identity Header (Read-Only) */}
              <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                <div className="w-20 h-20 rounded-2xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-4xl shadow-inner">
                  {mockProfile.logo}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{startup.name}</h2>
                    <Badge className="bg-[#635BFF]/10 text-[#635BFF] border-none text-[10px] uppercase">{mockProfile.stage}</Badge>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{mockProfile.industry}</p>
                </div>
              </div>

              {/* Elevator Pitch */}
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 border-l-4 border-l-[#635BFF]">
                <p className="text-base text-gray-200 font-medium italic">
                  "{mockProfile.elevatorPitch}"
                </p>
              </div>

              {/* Strategy Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-[11px] uppercase tracking-widest font-bold text-gray-500 flex items-center">
                    <Target className="w-3.5 h-3.5 mr-2 text-[#FF4D4F]" /> The Problem
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{mockProfile.problem}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[11px] uppercase tracking-widest font-bold text-gray-500 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-2 text-[#00D395]" /> The Solution
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{mockProfile.solution}</p>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <h4 className="text-[11px] uppercase tracking-widest font-bold text-gray-500 flex items-center">
                  <Globe className="w-3.5 h-3.5 mr-2 text-[#635BFF]" /> Mission Statement
                </h4>
                <p className="text-lg font-medium text-white italic">"{mockProfile.mission}"</p>
              </div>

              {/* Team Section */}
              <div className="pt-8 space-y-4">
                <h4 className="text-[11px] uppercase tracking-widest font-bold text-gray-500 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-2 text-[#635BFF]" /> Management Team
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mockProfile.team.map((member) => (
                    <div key={member.id} className="p-4 rounded-xl bg-[#1a1a1a] border border-white/5 flex flex-col items-center text-center">
                      <Avatar className="w-12 h-12 mb-3 border border-white/10">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <h5 className="text-sm font-bold text-white">{member.name}</h5>
                      <p className="text-[11px] text-gray-500">{member.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Sidebar Stats */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* Readiness Score (Admin View) */}
              <Card className="bg-[#1a1a1a] border-white/10 shadow-lg overflow-hidden">
                <CardHeader className="pb-2 border-b border-white/5 bg-white/[0.02]">
                  <CardTitle className="text-[11px] uppercase tracking-widest font-bold text-gray-400 flex items-center">
                    <Shield className="w-3.5 h-3.5 mr-2 text-[#635BFF]" /> Profile Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-white">85%</span>
                    <Badge className="bg-[#00D395]/10 text-[#00D395] border-none text-[9px]">Verified</Badge>
                  </div>
                  <Progress value={85} className="h-1.5 bg-gray-800 [&>div]:bg-[#635BFF]" />
                  <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                    Founder has provided detailed narrative and team bios. Market sizing documentation is missing.
                  </p>
                </CardContent>
              </Card>

              {/* Market Insights */}
              <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-[#1a1a1a]">
                <h4 className="text-[11px] uppercase tracking-widest font-bold text-gray-500 flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-2 text-[#00D395]" /> Market Positioning
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">TAM</span>
                    <span className="text-white font-semibold">{mockProfile.market.tam}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">SAM</span>
                    <span className="text-white font-semibold">{mockProfile.market.sam}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Moat</span>
                    <span className="text-[#F5A623] font-semibold text-[10px] uppercase">Proprietary Tech</span>
                  </div>
                </div>
              </div>

              {/* Internal Note Area */}
              <div className="p-4 rounded-xl border border-[#635BFF]/20 bg-[#635BFF]/5">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-white mb-2">Admin Assessment</h4>
                <p className="text-[12px] text-gray-300 leading-relaxed italic">
                  "Founder pedigree is strong (ex-Stripe). Problem statement is well-articulated. Need to verify central bank integrations mentioned in the moat."
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. Financials Tab */}
        <TabsContent value="financials" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="bg-[#0f0f0f] p-8 rounded-xl border border-white/10 space-y-8">
            
            {/* Header Mirror */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">Portfolio Financial Audit</h1>
                <p className="text-gray-400 text-sm">Reviewing unit economics and runway projections for <strong className="text-white">{startup.name}</strong>.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-white/10 text-gray-400 h-9 text-xs gap-2">
                  <Download className="w-3.5 h-3.5" /> Audit CSV
                </Button>
                <Button className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white h-9 text-xs">
                   Request Pulse Update
                </Button>
              </div>
            </div>

            {/* Core KPI Strip Mirror */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Verified Cash", value: "$1.2M", trend: "Last Sync: 2d ago", icon: Wallet, color: "#635BFF" },
                { label: "Net Burn Rate", value: "$32.4k", trend: "+4% MoM", icon: TrendingDown, color: "#FF4D4F" },
                { label: "Current Runway", value: "14 Mo", trend: "Healthy", icon: Activity, color: "#00D395" },
                { label: "LTV:CAC Ratio", value: "4.2x", trend: "Excellent", icon: Sparkles, color: "#F5A623" },
              ].map((kpi, i) => (
                <Card key={i} className="bg-[#1a1a1a] border-white/10 shadow-lg">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{kpi.label}</p>
                      <kpi.icon className="w-3.5 h-3.5 opacity-50" style={{ color: kpi.color }} />
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">{kpi.value}</p>
                    <p className="text-[9px] text-gray-500 font-medium">{kpi.trend}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Modeling & P&L */}
              <div className="lg:col-span-8 space-y-8">
                {/* P&L Chart Mirror */}
                <Card className="bg-[#1a1a1a] border-white/10">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-white uppercase tracking-widest">Revenue vs Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historicalPnL} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="month" stroke="#444" tick={{fill: '#666', fontSize: 11}} axisLine={false} tickLine={false} />
                          <YAxis stroke="#444" tick={{fill: '#666', fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                          <Bar dataKey="revenue" name="Revenue" fill="#635BFF" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Expenses" fill="#FF4D4F" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Runway Simulator Mirror */}
                <Card className="bg-[#1a1a1a] border-white/10 overflow-hidden">
                   <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-[#635BFF]" /> Admin Runway Simulator
                      </h4>
                      <Badge className="bg-[#635BFF]/10 text-[#635BFF] border-none text-[10px]">Read-Only Scenario</Badge>
                   </div>
                   <CardContent className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                         <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                               <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Simulation Scenario A</p>
                               <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-400">Target Growth</span>
                                  <span className="text-[#00D395] font-bold">12% MoM</span>
                               </div>
                               <div className="flex justify-between items-center text-sm mt-2">
                                  <span className="text-gray-400">Planned Hires</span>
                                  <span className="text-[#FF4D4F] font-bold">4 Engineers</span>
                               </div>
                            </div>
                            <div className="p-4 rounded-xl bg-[#635BFF]/5 border border-[#635BFF]/20">
                               <p className="text-[11px] text-gray-400 mb-1 font-medium">Projected Survival</p>
                               <p className="text-2xl font-bold text-white">16 Months</p>
                            </div>
                         </div>
                         <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={revenueData.slice(0, 12)}>
                                <Area type="monotone" dataKey="mrr" stroke="#635BFF" strokeWidth={2} fill="#635BFF" fillOpacity={0.1} />
                                <XAxis dataKey="month" hide />
                                <YAxis hide />
                              </AreaChart>
                            </ResponsiveContainer>
                         </div>
                      </div>
                   </CardContent>
                </Card>
              </div>

              {/* Right Column: Lab Insights & Pulse Log */}
              <div className="lg:col-span-4 space-y-6">
                 
                {/* Lab Insights Mirror */}
                <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#635BFF]/5 border-[#635BFF]/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#635BFF]" /> Risk & Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-[#00D395]">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">Growth Signal</span>
                      </div>
                      <p className="text-[11px] text-gray-300">Revenue growth is accelerating. Founder has high hire confidence.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-[#F5A623]">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">Efficiency Alert</span>
                      </div>
                      <p className="text-[11px] text-gray-300">LTV is strong (4x), but CAC has risen for two consecutive months.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Internal Admin Assessment */}
                <div className="p-6 rounded-2xl border border-[#635BFF]/20 bg-[#635BFF]/5 space-y-4">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-white mb-2">Lab Financial Assessment</h4>
                  <Textarea 
                    className="bg-black/40 border-white/10 text-[12px] h-32 placeholder:text-gray-600 focus:border-[#635BFF]/50" 
                    placeholder="Enter internal financial assessment notes..."
                    defaultValue="Unit economics remain best-in-class. Payback period on new customers remains under 4 months, justifying the recent marketing spend push."
                  />
                  <Button className="w-full bg-[#635BFF] hover:bg-[#635BFF]/90 text-xs h-9">
                    Save Assessment
                  </Button>
                </div>

                {/* Pulse Log Mirror */}
                <div className="space-y-3">
                   <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Recent Pulses</h4>
                   {[
                     { month: "Mar 2026", cash: "$1.2M", mrr: "$105k" },
                     { month: "Feb 2026", cash: "$1.28M", mrr: "$92k" },
                     { month: "Jan 2026", cash: "$1.35M", mrr: "$84k" }
                   ].map((pulse, i) => (
                     <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] border border-white/5 text-[11px]">
                        <span className="font-bold text-white">{pulse.month}</span>
                        <div className="flex gap-4">
                           <span className="text-gray-400">{pulse.cash}</span>
                           <span className="text-[#635BFF] font-bold">{pulse.mrr}</span>
                        </div>
                     </div>
                   ))}
                </div>

              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3.1 Targets Tab */}
        <TabsContent value="targets" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="bg-[#0f0f0f] p-8 rounded-xl border border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Strategic Targets</h3>
                <p className="text-gray-400 mt-1.5 text-sm">Reviewing {startup.name}'s performance against declared objectives.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="border-white/10 bg-white/5 text-gray-300 text-xs">
                  <Filter className="w-3.5 h-3.5 mr-2" /> Filter
                </Button>
                <Button className="bg-[#635BFF] hover:bg-[#7c75ff] text-white rounded-lg h-9 px-4 text-xs font-semibold">
                  Update Goal Status
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* MOCK TARGETS FOR VISUAL FIDELITY - To be hooked to `targets` array in Phase 2 */}
              {[
                { id: 1, title: "Hit $50k MRR", category: "Revenue", progress: 85, status: "On Track", deadline: "Dec 31" },
                { id: 2, title: "Hire Head of Growth", category: "Team", progress: 40, status: "Delayed", deadline: "Nov 15" },
                { id: 3, title: "Launch V2 Beta", category: "Product", progress: 100, status: "Achieved", deadline: "Oct 1" },
              ].map((target) => (
                <Card key={target.id} className="bg-[#1a1a1a] border-white/5 hover:border-[#635BFF]/30 transition-all shadow-lg rounded-xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="p-6 space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">{target.category}</span>
                          <h4 className="text-base font-bold text-white leading-tight">{target.title}</h4>
                        </div>
                        <ProgressRing progress={target.progress} size={50} color={target.status === "Delayed" ? "#FF4D4F" : target.status === "Achieved" ? "#00D395" : "#635BFF"} />
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">Status</span>
                          <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter rounded-full px-2 py-0 h-4 border-none ${
                            target.status === "On Track" ? "text-[#635BFF] bg-[#635BFF]/10" :
                            target.status === "Delayed" ? "text-[#FF4D4F] bg-[#FF4D4F]/10" :
                            "text-[#00D395] bg-[#00D395]/10"
                          }`}>
                            {target.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">Deadline</span>
                          <span className="text-gray-300 font-medium">{target.deadline}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Last updated 2 days ago</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-white"><MoreVertical className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Admin Insights Section */}
            <div className="mt-8 p-6 rounded-xl border border-[#635BFF]/20 bg-[#635BFF]/5 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#635BFF]">Lab Confidence</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">High</span>
                  <span className="text-gray-400 text-xs mb-1">92%</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Internal Assessment</p>
                <p className="text-[13px] text-gray-300 leading-relaxed">
                  Founder is executing well on product milestones. The "Revenue" target is slightly aggressive but achievable given the current growth trajectory. Primary risk remains the "Hiring" delay.
                </p>
              </div>
            </div>
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
          <div className="bg-[#0f0f0f] p-8 rounded-xl border border-white/10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#00D395]">
                  <Building2 className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Admin Talent Review</span>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Team & Operations</h3>
                <p className="text-gray-400 text-sm max-w-2xl">
                  Auditing {startup.name}'s leadership bench, hiring velocity, and organizational scaling.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-white/10 text-gray-400 h-9 text-xs gap-2">
                  <Workflow className="w-3.5 h-3.5" /> Org Chart
                </Button>
                <Button className="bg-[#635BFF] hover:bg-[#7c75ff] text-white h-9 text-xs font-semibold gap-2">
                  Flag Hiring Risk
                </Button>
              </div>
            </div>

            <div className="space-y-10">
              {/* CORE LEADERSHIP */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Leadership Bench</h4>
                  <Badge variant="outline" className="border-white/10 text-gray-500 font-normal">2 Co-Founders</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { id: 1, name: "Alex Rivera", role: "CEO & Co-Founder", bio: "Ex-Google Product Lead. Focused on strategic growth and fundraising.", linkedIn: "#", email: "alex@startup.com" },
                    { id: 2, name: "Sarah Chen", role: "CTO & Co-Founder", bio: "Systems architect. Built the core engine of our data platform.", linkedIn: "#", email: "sarah@startup.com" },
                  ].map((leader) => (
                    <Card key={leader.id} className="bg-[#1a1a1a] border-white/5 hover:border-[#635BFF]/30 transition-all overflow-hidden shadow-xl group">
                      <CardContent className="p-0">
                        <div className="p-6 flex items-start gap-5">
                          <Avatar className="h-14 w-14 border-2 border-white/5 ring-2 ring-[#635BFF]/10 group-hover:ring-[#635BFF]/30 transition-all">
                            <AvatarFallback className="bg-gradient-to-br from-[#635BFF] to-[#00D395] text-white font-bold">
                              {leader.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-bold text-white group-hover:text-[#635BFF] transition-colors">{leader.name}</h5>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-white">
                                  <Linkedin className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-[#00D395] uppercase tracking-widest mt-0.5">{leader.role}</p>
                            <p className="text-xs text-gray-400 mt-3 leading-relaxed italic line-clamp-2 italic">
                              "{leader.bio}"
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* HIRING PIPELINE */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Hiring Roadmap</h4>
                    <Button variant="ghost" size="sm" className="text-[10px] text-gray-500 hover:text-white">Open Pipeline</Button>
                  </div>
                  
                  <Card className="bg-[#1a1a1a] border-white/5 shadow-2xl rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="divide-y divide-white/5">
                        {[
                          { id: 1, role: "Senior Frontend Engineer", department: "Product", status: "Interviewing", priority: "High" },
                          { id: 2, role: "Growth Marketer", department: "Marketing", status: "Sourcing", priority: "Medium" },
                          { id: 3, role: "Customer Success Lead", department: "Ops", status: "Planned", priority: "Low" },
                        ].map((job) => (
                          <div key={job.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${
                                job.priority === 'High' ? 'bg-[#FF4D4F]/10 text-[#FF4D4F]' : 
                                job.priority === 'Medium' ? 'bg-[#F5A623]/10 text-[#F5A623]' : 'bg-gray-800 text-gray-400'
                              }`}>
                                <UserPlus className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h6 className="text-xs font-bold text-white leading-none">{job.role}</h6>
                                <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-wider">{job.department} • {job.status}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter ${
                              job.priority === 'High' ? 'border-[#FF4D4F]/30 text-[#FF4D4F] bg-[#FF4D4F]/5' : 'border-white/10 text-gray-500'
                            }`}>
                              {job.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* OPS ASSESSMENT */}
                <div className="lg:col-span-5 space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Operational Health</h4>
                  
                  <Card className="bg-[#111113] border-[#635BFF]/20 relative overflow-hidden">
                    <CardContent className="p-6 space-y-6">
                      <div>
                        <h5 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">Metric Audit</h5>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-gray-400">Engineering Velocity</span>
                              <span className="text-[#00D395] font-bold">88%</span>
                            </div>
                            <Progress value={88} className="h-1 bg-gray-800 [&>div]:bg-[#00D395]" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-gray-400">Team Retention Risk</span>
                              <span className="text-gray-400 font-bold">Low</span>
                            </div>
                            <Progress value={15} className="h-1 bg-gray-800 [&>div]:bg-[#00D395]" />
                          </div>
                        </div>
                      </div>

                      {/* Admin Private Assessment */}
                      <div className="p-4 rounded-lg bg-[#635BFF]/5 border border-[#635BFF]/20">
                        <div className="flex items-center gap-2 text-[#635BFF] mb-2">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Staff Talent Assessment</span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-snug">
                          The founding duo is exceptionally technical. However, the lack of a dedicated GTM (Go-to-market) lead is causing a bottleneck in the "Revenue" target. We should push them to finalize the Growth Marketer hire this month.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. Updates (Newsletter) Tab */}
        <TabsContent value="updates" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-2xl">
            <div className="mb-8">
              <h3 className="text-2xl font-heading font-semibold text-foreground">Achievements & Updates</h3>
              <p className="text-sm text-muted-foreground mt-2">Keep your investors and team updated with your latest wins, product launches, and milestones.</p>
            </div>            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              
              {startupUpdates.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed relative z-10 bg-background">
                  <p className="text-sm text-muted-foreground">No updates posted yet by the founder.</p>
                </div>
              ) : (
                startupUpdates.map((update: any, idx: number) => (
                  <div key={update.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active ${idx > 0 ? 'mt-6' : ''}`}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-background ${update.type === 'win' ? 'bg-accent' : 'bg-primary'} text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10`}>
                      {update.type === 'win' ? <Zap className="h-5 w-5" /> : <Rocket className="h-4 w-4" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border shadow-sm p-5 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg text-foreground">{update.title}</h4>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                          {new Date(update.created_at).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{update.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* 6. Document Vault Tab */}
        <TabsContent value="vault" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 bg-[#0f0f0f] p-8 rounded-xl border border-white/10">
            
            {/* LEFT COLUMN: The Review Desk */}
            <div className="xl:col-span-8 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Due Diligence Review</h3>
                  <p className="text-sm text-gray-400 mt-1">Review and verify startup documents for investment readiness.</p>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="sm" className="border-white/10 text-gray-400 h-8 gap-2">
                    <Filter className="w-3.5 h-3.5" /> Filter
                  </Button>
                </div>
              </div>

              {/* Document Grid Mirrored from Founder View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: "pitch-deck", title: "Pitch Deck", category: "Strategy", status: "Verified", updated: "Apr 12", focus: "Does it make sense?" },
                  { id: "roadmap", title: "Product Roadmap", category: "Strategy", status: "Pending", updated: "Apr 20", focus: "Can they build it?" },
                  { id: "cap-table", title: "Cap Table", category: "Financial", status: "Missing", updated: null, focus: "Fair ownership?" },
                  { id: "legal-kyc", title: "Legal & KYC", category: "Legal", status: "Verified", updated: "Jan 05", focus: "Is it legal?" },
                  { id: "term-sheet", title: "Term Sheet", category: "Legal", status: "Missing", updated: null, focus: "Fair deal?" },
                  { id: "financial-model", title: "Financial Model", category: "Financial", status: "Expired", updated: "Dec 20", focus: "Will they run out of money?" }
                ].map((doc) => (
                  <Card key={doc.id} className={`bg-[#1a1a1a] border-white/10 hover:border-white/20 transition-all ${doc.status === 'Missing' ? 'opacity-60 border-dashed' : ''}`}>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                            <FileText className="w-4 h-4 text-[#635BFF]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{doc.title}</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{doc.category}</p>
                          </div>
                        </div>
                        {doc.status !== 'Missing' && (
                          <Badge className={`text-[9px] font-bold px-1.5 py-0 ${
                            doc.status === 'Verified' ? 'bg-[#00D395]/10 text-[#00D395]' : 
                            doc.status === 'Pending' ? 'bg-[#F5A623]/10 text-[#F5A623]' : 'bg-[#FF4D4F]/10 text-[#FF4D4F]'
                          } border-none`}>
                            {doc.status}
                          </Badge>
                        )}
                      </div>

                      <div className="p-2.5 rounded bg-black/20 border border-white/5">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Admin Focus</p>
                        <p className="text-[11px] text-gray-300 italic">{doc.focus}</p>
                      </div>

                      {doc.status !== 'Missing' ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] bg-white/5 border-white/10 text-white hover:bg-[#00D395]/10 hover:text-[#00D395] hover:border-[#00D395]/30">
                            Verify
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] bg-white/5 border-white/10 text-white hover:bg-[#FF4D4F]/10 hover:text-[#FF4D4F] hover:border-[#FF4D4F]/30">
                            Flag
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-500 hover:text-white">
                            <Download className="h-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="py-2 text-center border border-dashed border-white/5 rounded">
                          <p className="text-[10px] text-gray-600 font-medium">Awaiting upload...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Summary & Score */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* Readiness Score Mirror */}
              <Card className="bg-[#1a1a1a] border-white/10 shadow-lg overflow-hidden">
                <CardHeader className="pb-2 border-b border-white/5 bg-white/[0.02]">
                  <CardTitle className="text-[11px] uppercase tracking-widest font-bold text-gray-400 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-2 text-[#635BFF]" /> Readiness Audit
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-white">40%</span>
                    <Badge className="bg-[#F5A623]/10 text-[#F5A623] border-none text-[9px]">Level 2</Badge>
                  </div>
                  <Progress value={40} className="h-1.5 bg-gray-800 [&>div]:bg-[#635BFF]" />
                  <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                    2/6 Mandatory documents verified. Cap Table and Term Sheet are critical blockers for graduation.
                  </p>
                </CardContent>
              </Card>

              {/* Internal Vault Notes */}
              <div className="p-4 rounded-xl border border-[#635BFF]/20 bg-[#635BFF]/5 space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-white mb-2">Internal Vault Notes</h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#635BFF] mt-2 shrink-0"></div>
                    <p className="text-[11px] text-gray-300 leading-tight">Pitch deck v2.4 is strong, but roadmap needs more technical depth on the infra side.</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#635BFF] mt-2 shrink-0"></div>
                    <p className="text-[11px] text-gray-300 leading-tight">Flagged the Financial Model—burn rate calculations don't account for the new hire.</p>
                  </div>
                </div>
              </div>

              {/* Action Log */}
              <div className="p-4 rounded-xl border border-white/5 bg-[#1a1a1a] space-y-3">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Recent Activity</h4>
                <div className="space-y-4">
                  {[
                    { action: "Admin verified Legal & KYC", time: "2h ago" },
                    { action: "Founder uploaded Roadmap v1.1", time: "5h ago" },
                    { action: "Admin flagged Financial Model", time: "1d ago" }
                  ].map((log, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400">{log.action}</span>
                      <span className="text-gray-600 tabular-nums">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <Card className="shadow-sm border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base font-semibold">Interaction Notes</CardTitle>
              <CardDescription>Log calls, meetings, observations, and key decisions. This is the Lab's institutional memory for {startup.name}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Add Note Input */}
              <div className="flex gap-3 mb-6">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={`Had a call with ${startup.founder_name}? Met them at an event? Log it here...`}
                  rows={3}
                  className="flex-1 resize-none"
                />
                <Button
                  className="shrink-0 self-end"
                  onClick={() => addNote.mutate()}
                  disabled={addNote.isPending || !noteText.trim()}
                >
                  {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              {/* Notes Timeline */}
              {notes.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No notes yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Start logging your interactions with {startup.founder_name}. Every note builds the Lab's knowledge base.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note: any) => (
                    <div key={note.id} className="relative pl-6 pb-4 border-l-2 border-border last:border-l-0">
                      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary/20 border-2 border-primary" />
                      <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="font-medium text-primary">{note.profiles?.email || "Lab Staff"}</span>
                          <span>•</span>
                          <span>{new Date(note.created_at).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span>{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Document Vault Tab */}
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
