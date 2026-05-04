import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, 
  ArrowUpRight, ArrowDownRight, Loader2, Plus, Clock, Rocket,
  Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { useNavigate } from "react-router-dom";

// --- MOCK DATA FOR "WOW" FACTOR ---
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

const burnBreakdown = [
  { name: 'Salaries', value: 55000, color: '#00D395' }, // Teal
  { name: 'Infrastructure', value: 12000, color: '#878A22' }, // Olive
  { name: 'Marketing', value: 18000, color: '#F5A623' }, // Amber
  { name: 'Operations', value: 6000, color: '#FF4D4F' }, // Red
];

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

  const metricConfig = (startup?.metric_config as string[]) || [];
  const labelMrr = metricConfig[0] || "Monthly Recurring Rev";
  const labelBurn = metricConfig[1] || "Net Burn Rate";
  const labelUsers = metricConfig[2] || "Active Users (WAU)";
  const labelChurn = metricConfig[3] || "Logo Churn Rate";
  const currencySymbol = startup?.currency === 'NGN' ? '₦' : startup?.currency === 'GBP' ? '£' : startup?.currency === 'EUR' ? '€' : '$';

  const isDemoMode = pulses.length === 0;

  const chartData = !isDemoMode ? pulses.map(p => ({
    month: p.month.split('-')[1],
    mrr: p.mrr,
    new: p.new_users,
    churned: p.lost_users
  })) : revenueData; // Fallback to mock for demo

  // KPI Derivations
  const latestPulse = !isDemoMode ? pulses[pulses.length - 1] : null;
  const previousPulse = !isDemoMode ? pulses[pulses.length - 2] : null;

  const currentMrr = !isDemoMode ? (latestPulse?.mrr || 0) : 127400;
  const prevMrr = !isDemoMode ? (previousPulse?.mrr || 0) : 118000;
  const mrrGrowth = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr) * 100 : 8.2;

  const currentCash = !isDemoMode ? (latestPulse?.cash_in_bank || 0) : 1270000;
  const currentBurn = !isDemoMode ? (latestPulse?.expenses || 0) : 91000;
  const runwayValue = currentBurn > 0 ? (currentCash / currentBurn) : (startup?.runway_months || 14);
  const runwayMonthsStr = runwayValue.toFixed(1);

  const currentUsers = !isDemoMode ? (latestPulse?.active_users || startup?.active_users || 0) : 3840;
  const prevUsers = !isDemoMode ? (previousPulse?.active_users || 0) : 3400;
  const userGrowth = prevUsers > 0 ? ((currentUsers - prevUsers) / prevUsers) * 100 : 12.0;

  const healthScore = !isDemoMode ? Math.round(
    ((runwayValue >= 12 ? 100 : 50) * 0.4) + 
    ((userGrowth >= 10 ? 100 : 50) * 0.4) + 
    ((latestPulse?.team_size && latestPulse.team_size > 1 ? 100 : 50) * 0.2)
  ) : 88;

  const churnRate = !isDemoMode && latestPulse?.lost_users && latestPulse?.active_users 
    ? ((latestPulse.lost_users / latestPulse.active_users) * 100).toFixed(1)
    : "2.3";

  const spendLabels = metricConfig.length > 4 ? metricConfig.slice(metricConfig.length - 4) : ["Salaries & Talent", "Software & Infra", "Growth & Marketing", "Ops & Admin"];

  const burnBreakdownData = !isDemoMode ? [
    { name: spendLabels[0], value: latestPulse?.spend_salaries || 0, color: '#00D395' },
    { name: spendLabels[1], value: latestPulse?.spend_infra || 0, color: '#878A22' },
    { name: spendLabels[2], value: latestPulse?.spend_marketing || 0, color: '#F5A623' },
    { name: spendLabels[3], value: latestPulse?.spend_ops || 0, color: '#FF4D4F' },
  ] : burnBreakdown;

  const hasBurnData = isDemoMode || burnBreakdownData.some(b => b.value > 0);

  const getHealthColor = (score: number) => score > 70 ? 'text-[#00D395]' : score > 40 ? 'text-[#F5A623]' : 'text-[#FF4D4F]';
  const getHealthStroke = (score: number) => score > 70 ? '#00D395' : score > 40 ? '#F5A623' : '#FF4D4F';

  // Dynamic Alerts Logic
  const alerts = [];
  if (runwayValue < 6) {
    alerts.push({ type: 'danger', color: '#FF4D4F', title: 'Runway Warning', message: `Your runway is critically low (${runwayMonthsStr} months). Contact your Lab Lead.` });
  }
  if (!isDemoMode && Number(churnRate) > 5) {
    alerts.push({ type: 'warning', color: '#F5A623', title: 'High Churn', message: `Your churn rate has spiked to ${churnRate}%. Prioritize customer success.` });
  }
  if (priorities.length === 0) {
    alerts.push({ type: 'warning', color: '#878A22', title: 'No Priorities', message: `You have no pinned tasks. Go to Command Center to set your focus.` });
  }
  if (alerts.length === 0) {
    alerts.push({ type: 'success', color: '#00D395', title: 'All Clear', message: `No critical alerts at this time. Keep up the momentum!` });
  }

  const founderDisplay = profile?.full_name || user?.email?.split('@')[0] || "Founder";

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
      
      {/* HEADER ACTION BAR */}
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

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[#1A1A1A] leading-none">{founderDisplay}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Founder & CEO</p>
          </div>
          <Avatar className="h-10 w-10 border-2 border-white ring-2 ring-[#00D395]/20 shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-[#00D395] to-[#878A22] text-white text-xs font-bold">
              {founderDisplay.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      {/* 1. WELCOME BANNER (Task 1) */}
      <WelcomeBanner 
        founderName={founderDisplay} 
        startupName={startup.name} 
        pulseStatus="due" 
        onActionClick={() => navigate('/updates')}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 px-4 sm:px-6">
        
        {/* LEFT COLUMN: KPI Strip + Main Charts (Takes 9 columns) */}
        <div className="xl:col-span-9 space-y-6">
          
          {/* ZONE 1: KPI STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* KPI 1: MRR */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">{labelMrr}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">
                    {currencySymbol}{(currentMrr / 1000).toFixed(1)}k
                  </h3>
                  <div className={`flex items-center text-sm font-bold bg-${mrrGrowth >= 0 ? '[#00D395]' : '[#FF4D4F]'}/10 px-2 py-0.5 rounded text-${mrrGrowth >= 0 ? '[#00D395]' : '[#FF4D4F]'}`}>
                    {mrrGrowth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5 stroke-[3px]" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 stroke-[3px]" />}
                    {Math.abs(mrrGrowth).toFixed(1)}%
                  </div>
                </div>
                <div className="mt-4"><SparkLine data={chartData} dataKey="mrr" color="#00D395" /></div>
              </CardContent>
            </Card>

            {/* KPI 2: Runway */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">Cash Runway</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">{runwayMonthsStr} <span className="text-lg text-gray-400 font-medium">mo</span></h3>
                  <Badge variant="outline" className={`border-none ${runwayValue >= 12 ? 'text-[#878A22] bg-[#878A22]/10' : 'text-[#FF4D4F] bg-[#FF4D4F]/10'} font-bold`}>
                    {runwayValue >= 12 ? 'Healthy' : 'Low Runway'}
                  </Badge>
                </div>
                <div className="mt-6 space-y-2">
                  <Progress value={(Math.min(runwayValue, 24) / 24) * 100} className="h-2 bg-gray-100 [&>div]:bg-[#00D395]" />
                  <p className="text-[10px] text-gray-400 text-right font-bold uppercase tracking-widest">Target: &gt;18 mo</p>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Burn Rate */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">{labelBurn}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">
                    {currencySymbol}{(currentBurn / 1000).toFixed(1)}k
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100 font-medium">
                  {latestPulse?.expenses ? "Actual expenses from latest pulse." : "No expense data logged yet."}
                </p>
              </CardContent>
            </Card>

            {/* KPI 4: Active Users */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">{labelUsers}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">{currentUsers.toLocaleString()}</h3>
                  <div className={`flex items-center text-sm font-bold bg-${userGrowth >= 0 ? '[#00D395]' : '[#FF4D4F]'}/10 px-2 py-0.5 rounded text-${userGrowth >= 0 ? '[#00D395]' : '[#FF4D4F]'}`}>
                    {userGrowth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5 stroke-[3px]" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 stroke-[3px]" />}
                    {Math.abs(userGrowth).toFixed(1)}%
                  </div>
                </div>
                <div className="mt-4"><SparkLine data={chartData} dataKey="new" color="#00D395" /></div>
              </CardContent>
            </Card>

            {/* KPI 5: Churn Rate */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">{labelChurn}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-[#1A1A1A] tabular-nums tracking-tight">{churnRate}%</h3>
                </div>
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100 font-medium">
                  {latestPulse?.lost_users ? "Calculated from monthly churn logs." : "No churn data logged yet."}
                </p>
              </CardContent>
            </Card>

            {/* KPI 6: Cash Balance */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden">
              <CardContent className="p-5 pb-2">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">Cash Balance</p>
                <h3 className="text-4xl font-bold text-[#1A1A1A] tabular-nums tracking-tight mt-1">
                  {currencySymbol}{(currentCash / 1000000).toFixed(2)}M
                </h3>
              </CardContent>
              <div className="px-5 pb-5">
                <div className="w-full bg-[#F9F6F2] border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Next Payroll:</span>
                  <span className="text-xs font-bold text-[#1A1A1A]">-{currencySymbol}55k in 4d</span>
                </div>
              </div>
            </Card>
          </div>

          {/* ZONE 2: MAIN CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="bg-white border-gray-100 shadow-sm lg:col-span-2 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">{labelMrr} Trajectory</CardTitle>
                <CardDescription className="text-gray-500">Actual {labelMrr} vs Target Projection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" stroke="#999" tick={{fill: '#666', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#999" tick={{fill: '#666', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `${currencySymbol}${val/1000}k`} dx={-10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderColor: '#eee', color: '#1A1A1A', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        itemStyle={{ color: '#1A1A1A', fontWeight: 600 }}
                        cursor={{ fill: '#f9f9f9' }}
                      />
                      <Bar 
                        dataKey="mrr" 
                        fill="#00D395" 
                        radius={[6, 6, 0, 0]} 
                        barSize={32}
                        activeBar={{ fill: '#00A389' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* User Growth */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">User Growth & Churn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" stroke="#999" tick={{fill: '#666', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#999" tick={{fill: '#666', fontSize: 12}} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderColor: '#eee', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                        cursor={{fill: '#f9f9f9'}}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: '#666' }} />
                      <Bar dataKey="new" name="New Users" stackId="a" fill="#00D395" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="churned" name="Churned" stackId="a" fill="#FF4D4F" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Burn Breakdown */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl">
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
                          <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#eee', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} itemStyle={{color: '#1A1A1A'}} />
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
                          <span className="text-xs font-bold text-[#1A1A1A] tabular-nums">{currencySymbol}{(item.value/1000).toFixed(1)}k</span>
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
          
          {/* Health Score */}
          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00D395] to-[#878A22]"></div>
            <CardHeader className="pb-0 items-center text-center mt-2">
              <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Company Health</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-6">
              <div className="relative w-36 h-36 flex items-center justify-center my-6">
                {/* SVG Gauge */}
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" 
                    stroke={getHealthStroke(healthScore)} 
                    strokeWidth="8" 
                    strokeDasharray={`${(healthScore/100) * 283} 283`} 
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-5xl font-bold tracking-tighter ${getHealthColor(healthScore)}`}>{healthScore}</span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mt-1">Score</span>
                </div>
              </div>
              <div className="w-full bg-[#F9F6F2] border border-gray-100 rounded-xl p-3 text-center">
                <p className="text-[11px] text-gray-500 font-medium">
                  Weakest pillar: <strong className="text-[#1A1A1A] font-bold">Burn Efficiency</strong>
                </p>
              </div>
            </CardContent>
          </Card>

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
