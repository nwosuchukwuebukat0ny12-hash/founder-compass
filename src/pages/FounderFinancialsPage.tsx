import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, TrendingDown, TrendingUp, Activity, 
  Calculator, AlertCircle, ArrowUpRight, ArrowDownRight, 
  Wallet, Users, FileText, Download, Filter, 
  ArrowRight, ShieldCheck, Sparkles, TrendingUp as TrendIcon,
  ChevronDown, Search, MoreHorizontal, Check, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, ReferenceLine, LineChart, Line, Cell
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REVENUE_RETENTION = [
  { month: "Month 1", rate: 100 },
  { month: "Month 2", rate: 94 },
  { month: "Month 3", rate: 89 },
  { month: "Month 4", rate: 86 },
  { month: "Month 5", rate: 84 },
  { month: "Month 6", rate: 82 },
];

export default function FounderFinancialsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch Startup Data
  const { data: startup, isLoading: isStartupLoading } = useQuery({
    queryKey: ["startup", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: profile } = await supabase.from("profiles").select("startup_id").eq("id", user.id).single();
      if (!profile?.startup_id) return null;
      const { data, error } = await supabase.from("startups").select("*").eq("id", profile.startup_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch Pulse History
  const { data: pulses = [], isLoading: isPulsesLoading } = useQuery({
    queryKey: ["pulses", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase
        .from("pulses")
        .select("*")
        .eq("startup_id", startup.id)
        .order("month", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!startup?.id,
  });

  // Calculator State
  const [mrrGrowth, setMrrGrowth] = useState(8); 
  const [newHires, setNewHires] = useState(2);
  const [retentionRate, setRetentionRate] = useState(90); // 3rd Slider: Customer Retention
  
  const latestPulse = pulses[0] || { mrr: 0, expenses: 0, cash_in_bank: 0 };
  const startingCash = latestPulse.cash_in_bank || 0;
  const startingMrr = latestPulse.mrr || 0;
  const baseExpenses = latestPulse.expenses || 0;
  const costPerHire = 8000;

  const sym = startup?.currency === 'NGN' ? '₦' : startup?.currency === 'GBP' ? '£' : startup?.currency === 'EUR' ? '€' : '$';

  // Unit Economics Proxies
  const calculateProxies = () => {
    if (pulses.length < 2) return { ltvCac: "N/A", retention: "N/A", burnRate: "0" };
    
    // Simplistic proxy calculations based on recent pulses
    const latest = pulses[0];
    const prev = pulses[1];
    
    const churnProxy = (latest.lost_users || 0) / Math.max(prev.active_users || 1, 1);
    const retention = ((1 - churnProxy) * 100).toFixed(1);
    
    const arpu = (latest.mrr || 0) / Math.max(latest.active_users || 1, 1);
    const cac = (latest.spend_marketing || 0) / Math.max(latest.new_users || 1, 1);
    
    let ltvCac = "N/A";
    if (churnProxy > 0 && cac > 0) {
      const ltv = arpu / churnProxy;
      ltvCac = (ltv / cac).toFixed(1) + "x";
    }

    // Default Runway calculation
    const currentBurn = Math.max(0, (latest.expenses || 0) - (latest.mrr || 0));
    
    return { ltvCac, retention: retention + "%", currentBurn };
  };

  const proxies = useMemo(() => calculateProxies(), [pulses]);

  const projectionData = useMemo(() => {
    let currentCash = startingCash;
    let currentMrr = startingMrr;
    let currentExpenses = baseExpenses;

    
    const data = [];
    const months = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
    
    for (let i = 0; i < 12; i++) {
      // Dynamic expenses factoring in hiring velocity
      const activeExpenses = currentExpenses + (newHires * costPerHire * (i + 1) / 12); 
      
      const burn = activeExpenses - currentMrr;
      currentCash = currentCash - burn;
      data.push({
        month: months[i],
        cash: Math.max(0, currentCash),
        realCash: currentCash,
        burn: burn,
        mrr: currentMrr
      });
      // Growth is offset by the churn (100 - retention)
      const netGrowth = (mrrGrowth / 100) - ((100 - retentionRate) / 100);
      currentMrr = currentMrr * (1 + netGrowth);
    }
    return data;
  }, [mrrGrowth, newHires, retentionRate, startingCash, startingMrr, baseExpenses]);

  const monthsOfRunway = projectionData.findIndex(d => d.realCash <= 0);
  const runwayDisplay = monthsOfRunway === -1 ? "> 12" : monthsOfRunway.toString();
  const isHealthy = monthsOfRunway === -1 || monthsOfRunway >= 9;

  // Chart Formatting
  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `${sym}${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${sym}${(val / 1000).toFixed(0)}k`;
    return `${sym}${val}`;
  };

  const chartData = useMemo(() => {
    return [...pulses].reverse().map(p => ({
      month: new Date(p.month).toLocaleDateString('default', { month: 'short', year: '2-digit' }),
      mrr: p.mrr || 0,
      expenses: p.expenses || 0
    }));
  }, [pulses]);

  if (isStartupLoading || isPulsesLoading) {
    return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="animate-spin text-[#00D395]" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* 1. CFO HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#00D395]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Financial Cockpit</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1A1A1A] font-serif">Portfolio Financials</h1>
          <p className="text-gray-500 max-w-2xl">
            Detailed unit economics, runway modeling, and historical growth trends for <strong className="text-[#1A1A1A]">Series A Readiness</strong>.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-[#1A1A1A] h-10 gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button className="bg-[#00D395] hover:bg-[#00A389] text-white h-10 gap-2 font-bold shadow-sm">
             Update Pulse
          </Button>
        </div>
      </div>

      {/* 2. CORE KPIS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Cash in Bank", value: formatCurrency(startingCash), trend: "Latest", icon: Wallet, color: "#00D395" },
          { label: "Net Burn Rate", value: formatCurrency(proxies.currentBurn), trend: "Monthly", icon: TrendingDown, color: "#FF4D4F" },
          { label: "Default Runway", value: (startup?.runway_months || runwayDisplay) + " Mo", trend: "Current", icon: Activity, color: "#878A22" },
          { label: "Est. LTV:CAC", value: proxies.ltvCac, trend: "Proxy", icon: Sparkles, color: "#F5A623" },
        ].map((kpi, i) => (
          <Card key={i} className="bg-white border-gray-200 shadow-sm rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <Badge variant="outline" className="text-[9px] border-gray-200 text-gray-500 uppercase font-bold">{kpi.trend}</Badge>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-[#1A1A1A] tabular-nums">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border border-gray-200 p-1 h-12 w-full md:w-auto rounded-full shadow-sm">
          <TabsTrigger value="overview" className="flex-1 md:px-8 data-[state=active]:bg-[#00D395] data-[state=active]:text-white rounded-full transition-all font-bold">Overview</TabsTrigger>
          <TabsTrigger value="modeling" className="flex-1 md:px-8 data-[state=active]:bg-[#00D395] data-[state=active]:text-white rounded-full transition-all font-bold">Runway Simulator</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 md:px-8 data-[state=active]:bg-[#00D395] data-[state=active]:text-white rounded-full transition-all font-bold">Pulse History</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & INSIGHTS */}
        <TabsContent value="overview" className="space-y-8 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Growth Trends */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 pb-4 bg-gray-50/50">
                  <div>
                    <CardTitle className="text-lg font-bold text-[#1A1A1A]">Revenue vs Expenses</CardTitle>
                    <CardDescription className="text-xs text-gray-500 font-medium">MoM P&L Trajectory</CardDescription>
                  </div>
                  <Badge className="bg-[#00D395]/10 text-[#00D395] border-none font-bold">Positive Trend</Badge>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[300px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#999" tick={{fill: '#666', fontSize: 11}} axisLine={false} tickLine={false} />
                          <YAxis stroke="#999" tick={{fill: '#666', fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${v >= 1000 ? v/1000 + 'k' : v}`} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#fff', borderColor: '#eee', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#1A1A1A' }}
                            cursor={{fill: '#f9f9f9'}}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px', color: '#666' }} />
                          <Bar dataKey="mrr" name="Revenue" fill="#00D395" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Expenses" fill="#FF4D4F" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400 font-medium border border-dashed border-gray-200 rounded-xl">
                        Log your first Pulse to see charting
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Unit Economics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white border-gray-200 shadow-sm rounded-2xl">
                   <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Revenue Retention</h4>
                        <TrendIcon className="w-4 h-4 text-[#00D395]" />
                      </div>
                       <div className="h-[180px] w-full flex items-center justify-center">
                         <div className="text-center">
                           <p className="text-3xl font-bold text-[#1A1A1A]">{proxies.retention}</p>
                           <p className="text-[10px] uppercase font-bold text-gray-500 mt-2">Latest Cohort Proxy</p>
                         </div>
                       </div>
                       <div className="mt-4 flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Est. Retention</span>
                          <span className="text-sm font-bold text-[#1A1A1A]">{proxies.retention}</span>
                       </div>
                   </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                         <h4 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Efficiency Multiplier</h4>
                         <Badge className="bg-[#F5A623]/10 text-[#F5A623] border-none font-bold">Tier 1</Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-4xl font-bold text-[#1A1A1A]">{proxies.ltvCac}</p>
                        <p className="text-xs text-gray-600 font-medium leading-relaxed">
                          Estimated LTV:CAC ratio based on recent customer acquisition and churn proxies.
                        </p>
                      </div>
                   </div>
                   <div className="pt-6 border-t border-gray-100 flex gap-2">
                      <Button variant="ghost" className="text-[10px] text-gray-500 hover:text-[#00D395] p-0 h-auto gap-1 font-bold uppercase tracking-widest">
                        View Compares <ArrowRight className="w-3 h-3" />
                      </Button>
                   </div>
                </Card>
              </div>
            </div>

            {/* Right Column: Insights Panel (Anuri's Research) */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-[#00D395]/5 border-[#00D395]/20 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00D395]" /> Lab Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-[#00D395]">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">Growth Signal</span>
                    </div>
                    <p className="text-[12px] text-gray-600 font-medium leading-snug">
                      Your MRR growth is accelerating relative to your hiring plan. You have room to increase marketing spend.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-[#F5A623]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">Efficiency Alert</span>
                    </div>
                    <p className="text-[12px] text-gray-600 font-medium leading-snug">
                      Churn spiked to 4.2% in March. This is above your cohort average (2.5%).
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Series A Readiness Checklist */}
              <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Readiness Audit</h4>
                <div className="space-y-3">
                  {[
                    { label: "12+ Months Runway", done: true },
                    { label: "MoM Growth > 10%", done: false },
                    { label: "LTV:CAC > 3x", done: true },
                    { label: "Clean Data Vault", done: true }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-semibold">{item.label}</span>
                      {item.done ? <CheckCircle2 className="w-4 h-4 text-[#00D395]" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: MODELING (EXISTING LOGIC) */}
        <TabsContent value="modeling" className="mt-6">
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
             <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                <div className="p-8 space-y-8 bg-gray-50/50">
                   <div className="space-y-1">
                      <h3 className="text-lg font-bold text-[#1A1A1A]">Runway Simulator</h3>
                      <p className="text-xs text-gray-500 font-medium">Adjust variables to see how hiring and growth impacts your zero-cash date.</p>
                   </div>

                   <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] uppercase font-bold text-gray-500">MRR Growth Rate</label>
                        <span className="text-[#00D395] font-mono font-bold">{mrrGrowth}%</span>
                      </div>
                      <Slider value={[mrrGrowth]} onValueChange={(v) => setMrrGrowth(v[0])} max={25} step={1} className="[&>span]:bg-[#00D395]" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] uppercase font-bold text-gray-500">New Monthly Hires</label>
                        <span className="text-[#FF4D4F] font-mono font-bold">{newHires}</span>
                      </div>
                      <Slider value={[newHires]} onValueChange={(v) => setNewHires(v[0])} max={10} step={1} className="[&>span]:bg-[#FF4D4F]" />
                    </div>
                  </div>

                  <div className={`p-5 rounded-xl border ${isHealthy ? 'border-[#00D395]/20 bg-[#00D395]/5' : 'border-[#FF4D4F]/20 bg-[#FF4D4F]/5'}`}>
                     <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Projected Outcome</p>
                     <p className={`text-2xl font-bold ${isHealthy ? 'text-[#00D395]' : 'text-[#FF4D4F]'}`}>
                        {monthsOfRunway === -1 ? "Infinite Runway (Alive)" : `Ran out in ${monthsOfRunway} Mo`}
                     </p>
                  </div>
                </div>

                <div className="lg:col-span-2 p-8">
                   <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectionData}>
                          <defs>
                            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00D395" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#00D395" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#999" tick={{fill: '#666', fontSize: 11}} axisLine={false} tickLine={false} />
                          <YAxis stroke="#999" tick={{fill: '#666', fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${v >= 1000 ? v/1000 + 'k' : v}`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#eee', borderRadius: '8px', color: '#1A1A1A' }} />
                          <ReferenceLine y={0} stroke="#FF4D4F" strokeDasharray="3 3" />
                          <Area type="monotone" dataKey="realCash" stroke="#00D395" strokeWidth={3} fill="url(#colorCash)" />
                        </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </Card>
        </TabsContent>

        {/* TAB 3: PULSE HISTORY */}
        <TabsContent value="history" className="mt-6">
           <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                 <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00D395]/50 transition-all shadow-sm text-[#1A1A1A]" placeholder="Search pulses..." />
                 </div>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:text-[#1A1A1A] h-10 gap-2 font-bold">
                       <Filter className="w-3.5 h-3.5" /> Filter
                    </Button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="p-4 text-[11px] uppercase font-bold text-gray-500">Month</th>
                          <th className="p-4 text-[11px] uppercase font-bold text-gray-500">MRR</th>
                          <th className="p-4 text-[11px] uppercase font-bold text-gray-500">Burn</th>
                          <th className="p-4 text-[11px] uppercase font-bold text-gray-500">Cash</th>
                          <th className="p-4 text-[11px] uppercase font-bold text-gray-500">Users</th>
                          <th className="p-4 text-[11px] uppercase font-bold text-gray-500">Runway</th>
                          <th className="p-4 text-[11px] uppercase font-bold text-gray-500">Status</th>
                          <th className="p-4"></th>
                       </tr>
                    </thead>
                    <tbody>
                       {pulses.length === 0 ? (
                         <tr>
                           <td colSpan={8} className="p-8 text-center text-gray-400 font-medium text-sm">No pulses submitted yet.</td>
                         </tr>
                       ) : (
                         pulses.map((pulse) => {
                           const isHealthy = (pulse.cash_in_bank || 0) > ((pulse.expenses || 0) * 3);
                           const runway = pulse.expenses && pulse.expenses > 0 ? Math.round((pulse.cash_in_bank || 0) / pulse.expenses) : '>12';
                           return (
                             <tr key={pulse.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                <td className="p-4 text-sm font-bold text-[#1A1A1A]">{new Date(pulse.month).toLocaleDateString('default', { month: 'short', year: 'numeric' })}</td>
                                <td className="p-4 text-sm text-gray-600 font-medium tabular-nums">{formatCurrency(pulse.mrr || 0)}</td>
                                <td className="p-4 text-sm text-gray-600 font-medium tabular-nums">{formatCurrency(pulse.expenses || 0)}</td>
                                <td className="p-4 text-sm text-gray-600 font-medium tabular-nums">{formatCurrency(pulse.cash_in_bank || 0)}</td>
                                <td className="p-4 text-sm text-gray-600 font-medium tabular-nums">{pulse.active_users || 'N/A'}</td>
                                <td className="p-4 text-sm text-gray-600 font-medium">{runway} Mo</td>
                                <td className="p-4">
                                   <Badge className={`text-[10px] font-bold uppercase tracking-widest ${isHealthy ? 'bg-[#00D395]/10 text-[#00D395]' : 'bg-[#FF4D4F]/10 text-[#FF4D4F]'} border-none`}>
                                      {isHealthy ? 'Healthy' : 'At Risk'}
                                   </Badge>
                                </td>
                                <td className="p-4 text-right">
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#00D395]">
                                      <MoreHorizontal className="w-4 h-4" />
                                   </Button>
                                </td>
                             </tr>
                           )
                         })
                       )}
                    </tbody>
                 </table>
              </div>
           </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

// Helper component for checkmark
function CheckCircle2({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Check className="w-full h-full" />
    </div>
  );
}
