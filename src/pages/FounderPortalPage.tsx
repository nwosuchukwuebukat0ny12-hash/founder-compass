import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Loader2, Plus, Clock, Rocket,
  Building2, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { useNavigate } from "react-router-dom";

type BurnTimeframe = "daily" | "weekly" | "monthly";

function isWithinMs(dateStr: string, ms: number): boolean {
  return Date.now() - new Date(dateStr).getTime() <= ms;
}

// Recharts Sparkline component
const SparkLine = ({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data}>
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
    </LineChart>
  </ResponsiveContainer>
);

export default function FounderPortalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [burnTimeframe, setBurnTimeframe] = useState<BurnTimeframe>("monthly");

  const cycleTimeframe = () => {
    setBurnTimeframe((prev) => prev === "monthly" ? "daily" : prev === "daily" ? "weekly" : "monthly");
  };


  const { data: startup, isLoading: startupLoading } = useQuery({
    queryKey: ["founder-startup", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: profile } = await supabase.from("profiles").select("startup_id").eq("id", user.id).single();
      if (!profile?.startup_id) return null;
      const { data: startupData } = await supabase.from("startups").select("*").eq("id", profile.startup_id).single();
      return startupData;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["founder-profile-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: pulses = [], isLoading: pulsesLoading } = useQuery({
    queryKey: ["startup-pulses", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase.from("pulses").select("*").eq("startup_id", startup.id).order("month", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup,
  });

  const { data: priorities = [] } = useQuery({
    queryKey: ["pinned-milestones", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("founder_id", user.id)
        .eq("is_pinned", true)
        .neq("status", "Done")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Live transactions from startup_financials for interactive Burn card
  const { data: financialTxs = [] } = useQuery({
    queryKey: ["dashboard-financials", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase
        .from("startup_financials")
        .select("expenses, revenue, month")
        .eq("startup_id", startup.id)
        .order("month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  const currencySymbol = startup?.currency === 'NGN' ? '₦' : startup?.currency === 'GBP' ? '£' : startup?.currency === 'EUR' ? '€' : '$';

  const isDemoMode = pulses.length === 0;

  // KPI Derivations from real pulse data
  const latestPulse = !isDemoMode ? pulses[pulses.length - 1] : null;
  const previousPulse = !isDemoMode && pulses.length >= 2 ? pulses[pulses.length - 2] : null;

  const currentMrr = latestPulse?.mrr || 0;
  const prevMrr = previousPulse?.mrr || 0;
  const mrrGrowth = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr) * 100 : 0;

  const targetMrr = latestPulse?.target_mrr || 0;

  const currentCash = latestPulse?.cash_in_bank || 0;
  const currentBurn = latestPulse?.expenses || 0;
  const runwayValue = currentBurn > 0 ? (currentCash / currentBurn) : 0;
  const runwayMonthsStr = runwayValue.toFixed(1);

  const totalActiveCustomers = latestPulse?.active_users || 0;
  const prevCustomers = previousPulse?.active_users || 0;
  const customerGrowth = prevCustomers > 0 ? ((totalActiveCustomers - prevCustomers) / prevCustomers) * 100 : 0;

  const spendLabels = ["Salaries & Talent", "Software & Infra", "Growth & Marketing", "Ops & Admin"];

  const burnBreakdownData = [
    { name: spendLabels[0], value: latestPulse?.spend_salaries || 0, color: '#00D395' },
    { name: spendLabels[1], value: latestPulse?.spend_infra || 0, color: '#878A22' },
    { name: spendLabels[2], value: latestPulse?.spend_marketing || 0, color: '#F5A623' },
    { name: spendLabels[3], value: latestPulse?.spend_ops || 0, color: '#FF4D4F' },
  ];

  const hasBurnData = burnBreakdownData.some(b => b.value > 0);

  // MRR vs Target chart data from pulse history
  const mrrChartData = pulses.map(p => {
    const monthLabel = new Date(p.month + '-01').toLocaleString('default', { month: 'short' });
    return {
      month: monthLabel,
      mrr: p.mrr || 0,
      target: p.target_mrr || 0,
    };
  });

  // Dynamic Alerts Logic (simplified — no churn)
  const alerts: Array<{ type: string; color: string; title: string; message: string }> = [];
  if (runwayValue > 0 && runwayValue < 6) {
    alerts.push({ type: 'danger', color: '#FF4D4F', title: 'Runway Warning', message: `Your runway is critically low (${runwayMonthsStr} months). Contact your Lab Lead.` });
  }
  if (priorities.length === 0) {
    alerts.push({ type: 'warning', color: '#878A22', title: 'No Priorities', message: `You have no pinned tasks. Go to Command Center to set your focus.` });
  }
  if (alerts.length === 0) {
    alerts.push({ type: 'success', color: '#00D395', title: 'All Clear', message: `No critical alerts at this time. Keep up the momentum!` });
  }

  // Founder display: Last Name First Name
  const profileData = profile as any;
  const founderDisplay = profileData?.last_name && profileData?.first_name
    ? `${profileData.last_name} ${profileData.first_name}`
    : profileData?.full_name || user?.email?.split('@')[0] || "Founder";

  if (startupLoading || pulsesLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent">
        <Loader2 className="animate-spin text-[#00D395] w-8 h-8" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="p-12 text-center text-[#1A1A1A] h-screen flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold">Startup not found</h2>
        <p className="text-gray-500">Please contact your Lab Lead.</p>
      </div>
    );
  }

  return (
    <div className="font-sans pb-24 text-[#1A1A1A]">

      {/* HEADER ACTION BAR — founder name removed from here to avoid duplication */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-2xl shadow-sm overflow-hidden">
            {startup.logo_url ? (
              <img src={startup.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="text-gray-300 w-8 h-8" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">{startup.name}</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">Mission Control</p>
          </div>
        </div>
      </div>

      {/* 1. WELCOME BANNER */}
      <WelcomeBanner
        founderName={founderDisplay}
        startupName={startup.name}
        pulseStatus="due"
        onActionClick={() => navigate('/updates')}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 px-4 sm:px-6">

        {/* LEFT COLUMN: KPI Strip + Main Charts (Takes 9 columns) */}
        <div className="xl:col-span-9 space-y-6">

          {/* ZONE 1: 6 CORE KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* KPI 1: MRR */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">Monthly Recurring Rev</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">
                    {currentMrr > 0 ? `${currencySymbol}${(currentMrr / 1000).toFixed(1)}k` : '—'}
                  </h3>
                  {mrrGrowth !== 0 && (
                    <div className={`flex items-center text-sm font-bold px-2 py-0.5 rounded ${mrrGrowth >= 0 ? 'bg-[#00D395]/10 text-[#00D395]' : 'bg-[#FF4D4F]/10 text-[#FF4D4F]'}`}>
                      {mrrGrowth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5 stroke-[3px]" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 stroke-[3px]" />}
                      {Math.abs(mrrGrowth).toFixed(1)}%
                    </div>
                  )}
                </div>
                {mrrChartData.length > 1 && (
                  <div className="mt-4"><SparkLine data={mrrChartData} dataKey="mrr" color="#00D395" /></div>
                )}
              </CardContent>
            </Card>

            {/* KPI 2: Target MRR */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">Revenue Target</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">
                    {targetMrr > 0 ? `${currencySymbol}${(targetMrr / 1000).toFixed(1)}k` : '—'}
                  </h3>
                </div>
                {targetMrr > 0 && currentMrr > 0 && (
                  <div className="mt-4 space-y-2">
                    <Progress value={Math.min((currentMrr / targetMrr) * 100, 100)} className="h-2 bg-gray-100 [&>div]:bg-[#635BFF]" />
                    <p className="text-[10px] text-gray-400 text-right font-bold uppercase tracking-widest">
                      {((currentMrr / targetMrr) * 100).toFixed(0)}% of target
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KPI 3: Cash Balance */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">Cash Balance</p>
                <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">
                  {currentCash > 0
                    ? currentCash >= 1000000
                      ? `${currencySymbol}${(currentCash / 1000000).toFixed(2)}M`
                      : `${currencySymbol}${(currentCash / 1000).toFixed(1)}k`
                    : '—'}
                </h3>
              </CardContent>
            </Card>

            {/* KPI 4: Burn (Interactive) */}
            <Card
              className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:border-[#FF4D4F]/40 hover:shadow-md transition-all group"
              onClick={cycleTimeframe}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Burn</p>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    <RefreshCw className="w-2.5 h-2.5 group-hover:rotate-180 transition-transform duration-500" />
                    {burnTimeframe}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  {(() => {
                    // Calculate burn from live transactions by timeframe
                    const ms = burnTimeframe === "daily" ? 86400000 : burnTimeframe === "weekly" ? 604800000 : 2592000000;
                    const filtered = financialTxs.filter(tx => tx.month && isWithinMs(tx.month, ms));
                    const liveBurn = filtered.reduce((s, tx) => s + (tx.expenses || 0), 0);
                    // Fallback to pulse data if no transactions
                    const displayBurn = financialTxs.length > 0 ? liveBurn : currentBurn;
                    return (
                      <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">
                        {displayBurn > 0 ? `${currencySymbol}${displayBurn >= 1000 ? (displayBurn / 1000).toFixed(1) + 'k' : displayBurn.toFixed(0)}` : '—'}
                      </h3>
                    );
                  })()}
                </div>
                <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 font-medium">
                  Click to toggle Daily · Weekly · Monthly
                </p>
              </CardContent>
            </Card>

            {/* KPI 5: Runway */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">Cash Runway</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">
                    {runwayValue > 0 ? <>{runwayMonthsStr} <span className="text-lg text-gray-400 font-medium">mo</span></> : '—'}
                  </h3>
                  {runwayValue > 0 && (
                    <Badge variant="outline" className={`border-none ${runwayValue >= 12 ? 'text-[#878A22] bg-[#878A22]/10' : 'text-[#FF4D4F] bg-[#FF4D4F]/10'} font-bold`}>
                      {runwayValue >= 12 ? 'Healthy' : 'Low Runway'}
                    </Badge>
                  )}
                </div>
                {runwayValue > 0 && (
                  <div className="mt-4 space-y-2">
                    <Progress value={(Math.min(runwayValue, 24) / 24) * 100} className="h-2 bg-gray-100 [&>div]:bg-[#00D395]" />
                    <p className="text-[10px] text-gray-400 text-right font-bold uppercase tracking-widest">Target: &gt;18 mo</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KPI 6: Total Active Customers */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">Total Active Customers</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">
                    {totalActiveCustomers > 0 ? totalActiveCustomers.toLocaleString() : '—'}
                  </h3>
                  {customerGrowth !== 0 && (
                    <div className={`flex items-center text-sm font-bold px-2 py-0.5 rounded ${customerGrowth >= 0 ? 'bg-[#00D395]/10 text-[#00D395]' : 'bg-[#FF4D4F]/10 text-[#FF4D4F]'}`}>
                      {customerGrowth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5 stroke-[3px]" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 stroke-[3px]" />}
                      {Math.abs(customerGrowth).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100 font-medium">
                  {totalActiveCustomers > 0 ? "From your latest pulse data." : "No customer data logged yet."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ZONE 2: MAIN CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MRR vs Target Chart */}
            <Card className="bg-white border-gray-100 shadow-sm lg:col-span-2 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Revenue vs Target Projection</CardTitle>
                <CardDescription className="text-gray-500">Actual MRR compared to your target each month</CardDescription>
              </CardHeader>
              <CardContent>
                {mrrChartData.length > 0 ? (
                  <div className="h-[320px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mrrChartData} margin={{ top: 20, right: 20, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="month" stroke="#999" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#999" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${currencySymbol}${val / 1000}k`} dx={-10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', borderColor: '#eee', color: '#1A1A1A', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          itemStyle={{ color: '#1A1A1A', fontWeight: 600 }}
                          cursor={{ fill: '#f9f9f9' }}
                        />
                        <Bar
                          dataKey="mrr"
                          name="Actual MRR"
                          fill="#00D395"
                          radius={[6, 6, 0, 0]}
                          barSize={28}
                          activeBar={{ fill: '#00A389' }}
                        />
                        <Bar
                          dataKey="target"
                          name="Revenue Target"
                          fill="#635BFF"
                          radius={[6, 6, 0, 0]}
                          barSize={28}
                          opacity={0.3}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[320px] mt-4 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 font-medium italic">Submit your first Monthly Pulse to see your MRR trajectory.</p>
                    <Button variant="link" onClick={() => navigate('/updates')} className="text-[#00D395] text-xs mt-2 uppercase tracking-widest font-bold">Submit Pulse</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Burn Breakdown */}
            <Card className="bg-white border-gray-100 shadow-sm lg:col-span-2 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Monthly Burn Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {hasBurnData ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between h-[250px] mt-4 gap-4">
                    <div className="w-full sm:w-1/2 h-full min-h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={burnBreakdownData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {burnBreakdownData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#eee', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} itemStyle={{ color: '#1A1A1A' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 space-y-4">
                      {burnBreakdownData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.color }}></div>
                            <span className="text-xs text-gray-500 font-medium">{item.name}</span>
                          </div>
                          <span className="text-xs font-bold text-[#1A1A1A] tabular-nums">{currencySymbol}{(item.value / 1000).toFixed(1)}k</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[250px] mt-4 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 font-medium italic">No spend breakdown logged in your latest pulse.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* RIGHT COLUMN: Action Feed (Takes 3 columns) */}
        <div className="xl:col-span-3 space-y-6">

          {/* Critical Alerts */}
          <Card className={`bg-white border-t-2 ${alerts[0]?.type === 'danger' ? 'border-t-[#FF4D4F]' : alerts[0]?.type === 'warning' ? 'border-t-[#F5A623]' : 'border-t-[#00D395]'} border-x-gray-100 border-b-gray-100 rounded-2xl shadow-sm`}>
            <CardHeader className="pb-4">
              <div className="flex items-center">
                {alerts[0]?.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00D395] mr-2" />
                ) : (
                  <AlertCircle className={`w-4 h-4 mr-2`} style={{ color: alerts[0]?.color }} />
                )}
                <CardTitle className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest">Status / Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 p-3.5 rounded-xl border" style={{ backgroundColor: `${alert.color}0D`, borderColor: `${alert.color}26` }}>
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: alert.color }}>{alert.title}</span>
                  <span className="text-xs text-gray-600 font-medium leading-relaxed">{alert.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Focus Items */}
          <Card className="bg-white border-gray-100 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100">
              <CardTitle className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest">Top Priorities</CardTitle>
              <Button onClick={() => navigate('/targets')} variant="ghost" size="icon" className="h-6 w-6 rounded-full text-gray-400 hover:text-[#00D395] hover:bg-[#00D395]/10"><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {priorities.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-gray-400 font-medium">No pinned priorities.</p>
                  <Button variant="link" onClick={() => navigate('/targets')} className="text-[#00D395] text-[10px] mt-1 h-auto p-0 uppercase tracking-widest font-bold">Set targets</Button>
                </div>
              ) : (
                priorities.map((priority: any, idx: number) => (
                  <div key={priority.id} className={`px-5 py-4 hover:bg-[#F9F6F2] cursor-pointer transition-colors group ${idx !== priorities.length - 1 ? 'border-b border-gray-50' : 'rounded-b-2xl'}`}>
                    <div className="flex items-start">
                      <div className="w-4 h-4 rounded-full border border-gray-300 mr-3 mt-0.5 group-hover:border-[#00D395] group-hover:bg-[#00D395]/10 transition-colors flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-bold text-[#1A1A1A] leading-tight">{priority.title}</p>
                        <p className={`text-[10px] mt-1.5 font-bold uppercase tracking-widest ${priority.priority === 'High' ? 'text-[#FF4D4F]' : 'text-gray-400'}`}>
                          {priority.deadline ? `Due ${new Date(priority.deadline).toLocaleDateString()}` : priority.category || 'General Priority'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
