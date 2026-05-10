import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Loader2, Users, Briefcase, TrendingUp,
  Smile, Frown, Meh, ArrowUpRight, ArrowDownRight, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Plus, History, Settings2, Star, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Pulse = {
  id: string;
  month: string;
  team_size: number | null;
  team_morale: number | null;
  fundraising_status: string | null;
  spend_salaries: number | null;
  spend_infra: number | null;
  spend_marketing: number | null;
  spend_ops: number | null;
  new_users: number | null;
  lost_users: number | null;
  active_users: number | null;
};

type CustomMetric = {
  id: string;
  name: string;
  category: string;
  description: string;
  frequency: string;
  unit: string;
  format: "decimal" | "no-decimal";
  lowerBetter: boolean;
  currentValue?: number;
  lastUpdated?: string;
  history?: { timestamp: string; value: number }[];
};

const FUNDRAISING_COLORS: Record<string, { bg: string; text: string }> = {
  "Not raising": { bg: "bg-gray-100", text: "text-gray-500" },
  "Exploring": { bg: "bg-[#F5A623]/10", text: "text-[#F5A623]" },
  "Actively raising": { bg: "bg-[#635BFF]/10", text: "text-[#635BFF]" },
  "Closed round": { bg: "bg-[#00D395]/10", text: "text-[#00D395]" },
};

function MoraleIcon({ morale }: { morale: number | null }) {
  if (!morale) return <Meh className="w-4 h-4 text-gray-400" />;
  if (morale >= 4) return <Smile className="w-4 h-4 text-[#00D395]" />;
  if (morale >= 3) return <Meh className="w-4 h-4 text-[#F5A623]" />;
  return <Frown className="w-4 h-4 text-[#FF4D4F]" />;
}

function timeAgoStr(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch (e) {
    return "—";
  }
}

function formatMonthLabel(month: string | null | undefined, short = false) {
  if (!month) return "—";
  const date = new Date(month + "-01");
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("default", {
    month: short ? "short" : "long",
    year: short ? "2-digit" : "numeric",
  });
}

export default function CustomMetricsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewMetricOpen, setIsNewMetricOpen] = useState(false);
  const [isLogValuesOpen, setIsLogValuesOpen] = useState(false);

  const { data: startup } = useQuery({
    queryKey: ["founder-startup-metrics", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("startup_id")
        .eq("id", user!.id)
        .single();
      if (!profile?.startup_id) return null;
      const { data } = await supabase
        .from("startups")
        .select("id, name, currency, metric_config")
        .eq("id", profile.startup_id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: pulses = [], isLoading } = useQuery<Pulse[]>({
    queryKey: ["pulses-custom-metrics", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase
        .from("pulses")
        .select(
          "id, month, team_size, team_morale, fundraising_status, spend_salaries, spend_infra, spend_marketing, spend_ops, new_users, lost_users, active_users"
        )
        .eq("startup_id", startup.id)
        .order("month", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  const sym = startup?.currency === "NGN" ? "₦" : startup?.currency === "GBP" ? "£" : startup?.currency === "EUR" ? "€" : "$";

  // Derived chart data
  const teamChartData = pulses.map((p) => ({
    month: formatMonthLabel(p.month, true),
    "Team Size": p.team_size || 0,
    Morale: p.team_morale || 0,
  }));

  const spendChartData = pulses.map((p) => ({
    month: formatMonthLabel(p.month, true),
    Salaries: p.spend_salaries || 0,
    Infra: p.spend_infra || 0,
    Marketing: p.spend_marketing || 0,
    Ops: p.spend_ops || 0,
  }));

  const userChartData = pulses.map((p) => ({
    month: formatMonthLabel(p.month, true),
    "New": p.new_users || 0,
    "Churned": p.lost_users || 0,
    "Net": (p.new_users || 0) - (p.lost_users || 0),
  }));

  // Latest pulse snapshot
  const latest = pulses.length > 0 ? pulses[pulses.length - 1] : null;
  const previous = pulses.length >= 2 ? pulses[pulses.length - 2] : null;

  const teamDelta = latest?.team_size && previous?.team_size
    ? latest.team_size - previous.team_size
    : 0;

  const fundraisingStyle = latest?.fundraising_status
    ? FUNDRAISING_COLORS[latest.fundraising_status] || { bg: "bg-gray-100", text: "text-gray-500" }
    : null;

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `${sym}${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${sym}${(val / 1000).toFixed(1)}k`;
    return `${sym}${val}`;
  };

  const customMetrics: CustomMetric[] = (startup?.metric_config as any)?.custom_metrics || [];

  // Mutations
  const updateMetricConfig = useMutation({
    mutationFn: async (newConfig: any) => {
      if (!startup?.id) return;
      const { data, error } = await supabase
        .from("startups")
        .update({ metric_config: newConfig })
        .eq("id", startup.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Update failed. You may not have permission to update the startup settings (RLS policy missing).");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-startup-metrics"] });
      toast({ title: "Metric System Updated", description: "Your custom KPIs have been synced." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Update", description: error.message, variant: "destructive" });
    }
  });

  const handleAddMetric = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newMetric: CustomMetric = {
      id: crypto.randomUUID(),
      name: fd.get("name") as string,
      category: fd.get("category") as string,
      description: fd.get("description") as string,
      frequency: fd.get("frequency") as string,
      unit: fd.get("unit") as string,
      format: fd.get("format") as any,
      lowerBetter: fd.get("lowerBetter") === "yes",
      history: [],
    };

    const currentConfig = (startup?.metric_config as any) || { custom_metrics: [] };
    const updatedConfig = {
      ...currentConfig,
      custom_metrics: [...(currentConfig.custom_metrics || []), newMetric],
    };

    updateMetricConfig.mutate(updatedConfig);
    setIsNewMetricOpen(false);
  };

  const handleUpdateValues = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentConfig = (startup?.metric_config as any) || { custom_metrics: [] };
    const timestamp = new Date().toISOString();

    const updatedMetrics = customMetrics.map(m => {
      const val = fd.get(m.id);
      if (val !== null && val !== "") {
        const numVal = parseFloat(val as string);
        return {
          ...m,
          currentValue: numVal,
          lastUpdated: timestamp,
          history: [...(m.history || []), { timestamp, value: numVal }].slice(-20), // Keep last 20
        };
      }
      return m;
    });

    updateMetricConfig.mutate({ ...currentConfig, custom_metrics: updatedMetrics });
    setIsLogValuesOpen(false);
  };

  return (
    <div className="font-sans pb-24 text-[#1A1A1A]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5A623]/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Custom Metrics</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">
              Team · Fundraising · Spend · Growth
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isNewMetricOpen} onOpenChange={setIsNewMetricOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white border-gray-200 text-gray-600 hover:text-[#1A1A1A] text-xs font-bold uppercase tracking-widest rounded-xl px-5 h-11 border transition-all">
                <Plus className="w-4 h-4 mr-2" />
                New Metric
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white border-none shadow-2xl rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00D395] to-[#F5A623]"></div>
              <DialogHeader className="pt-6 px-8">
                <DialogTitle className="text-xl font-bold text-[#1A1A1A]">Add New Metric</DialogTitle>
                <DialogDescription className="text-gray-500 font-medium">Define a custom KPI to track your startup's unique progress.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMetric}>
                <div className="grid grid-cols-2 gap-6 p-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Name</Label>
                    <Input name="name" placeholder="Metric name" className="h-11 border-gray-100 bg-gray-50/50 rounded-xl" required />
                    <p className="text-[10px] text-gray-400">The name of your new metric.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger className="h-11 border-gray-100 bg-gray-50/50 rounded-xl">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100">
                        <SelectItem value="Financial Metrics">Financial Metrics</SelectItem>
                        <SelectItem value="Customer Metrics">Customer Metrics</SelectItem>
                        <SelectItem value="Product Metrics">Product Metrics</SelectItem>
                        <SelectItem value="Growth Metrics">Growth Metrics</SelectItem>
                        <SelectItem value="Sales and marketing Metrics">Sales and marketing Metrics</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-400">Select an existing category or add a new one.</p>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Description</Label>
                    <Textarea name="description" placeholder="Describe your metric" className="min-h-[100px] border-gray-100 bg-gray-50/50 rounded-xl" />
                    <p className="text-[10px] text-gray-400">A brief description of what this metric represents.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Frequency</Label>
                    <Select name="frequency" defaultValue="Monthly">
                      <SelectTrigger className="h-11 border-gray-100 bg-gray-50/50 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100">
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-400">How often this metric is measured.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Unit</Label>
                    <Select name="unit" defaultValue="Number">
                      <SelectTrigger className="h-11 border-gray-100 bg-gray-50/50 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100">
                        <SelectItem value="Number">Number</SelectItem>
                        <SelectItem value="Percentage">Percentage</SelectItem>
                        <SelectItem value="Currency">Currency</SelectItem>
                        <SelectItem value="Unit">Unit</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-400">The type of unit for this metric.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Format</Label>
                    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                      <input type="hidden" name="format" id="format-val" defaultValue="decimal" />
                      <button 
                        type="button"
                        onClick={() => { (document.getElementById('format-val') as HTMLInputElement).value = 'decimal'; (document.getElementById('btn-dec') as HTMLElement).classList.add('bg-[#00D395]', 'text-white'); (document.getElementById('btn-nodec') as HTMLElement).classList.remove('bg-[#00D395]', 'text-white'); }}
                        id="btn-dec"
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-[#00D395] text-white"
                      >Decimal</button>
                      <button 
                        type="button"
                        onClick={() => { (document.getElementById('format-val') as HTMLInputElement).value = 'no-decimal'; (document.getElementById('btn-nodec') as HTMLElement).classList.add('bg-[#00D395]', 'text-white'); (document.getElementById('btn-dec') as HTMLElement).classList.remove('bg-[#00D395]', 'text-white'); }}
                        id="btn-nodec"
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-500"
                      >No decimal</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Is a lower value better?</Label>
                    <RadioGroup name="lowerBetter" defaultValue="no" className="flex gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="low-yes" />
                        <Label htmlFor="low-yes" className="text-xs font-bold text-gray-600">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="low-no" />
                        <Label htmlFor="low-no" className="text-xs font-bold text-gray-600">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter className="bg-gray-50/50 p-6 px-8 flex justify-end gap-3 border-t border-gray-100">
                  <Button type="submit" className="bg-[#00D395] hover:bg-[#00A389] text-white text-xs font-bold uppercase tracking-widest rounded-xl px-8 h-11 transition-all">
                    Create Metric
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isLogValuesOpen} onOpenChange={setIsLogValuesOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-widest rounded-xl px-5 h-11 transition-all">
                <Zap className="w-3.5 h-3.5 mr-2" />
                Update Values
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white border-none shadow-2xl rounded-3xl overflow-hidden">
              <DialogHeader className="pt-6 px-8">
                <DialogTitle className="text-xl font-bold text-[#1A1A1A]">Update Metric Values</DialogTitle>
                <DialogDescription className="text-gray-500 font-medium">Enter current values for your custom KPIs.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateValues}>
                <div className="p-8 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {customMetrics.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-gray-400 font-medium italic">Create a custom metric first to start logging values.</p>
                    </div>
                  ) : (
                    customMetrics.map(m => (
                      <div key={m.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-gray-600 uppercase tracking-widest">{m.name}</Label>
                          {m.lastUpdated && <span className="text-[9px] text-gray-400 uppercase font-bold italic">Last: {timeAgoStr(m.lastUpdated)}</span>}
                        </div>
                        <div className="relative">
                          <Input name={m.id} type="number" step="any" placeholder={m.currentValue?.toString() || "0.00"} className="h-11 border-gray-100 bg-gray-50/50 rounded-xl pl-4" />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.unit}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <DialogFooter className="bg-gray-50/50 p-6 px-8 flex justify-end gap-3 border-t border-gray-100">
                  <Button type="submit" disabled={customMetrics.length === 0} className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-widest rounded-xl h-11 transition-all">
                    Sync All Values
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && pulses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F5A623]/10 flex items-center justify-center mb-4">
            <BarChart3 className="w-7 h-7 text-[#F5A623]" />
          </div>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">No data yet</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Submit your first Monthly Pulse to start tracking team size, morale, spend breakdown, and more.
          </p>
          <Button
            onClick={() => navigate("/updates")}
            variant="link"
            className="text-[#F5A623] text-xs font-bold uppercase tracking-widest mt-4"
          >
            Submit your first pulse →
          </Button>
        </div>
      )}

      {!isLoading && pulses.length > 0 && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Team Size Trend */}
            {teamChartData.some((d) => d["Team Size"] > 0) && (
              <Card className="bg-white border-gray-100 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Team Size Over Time</CardTitle>
                  <CardDescription className="text-gray-500">Monthly headcount trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={teamChartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradTeam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#635BFF" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#635BFF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: "#999", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#999", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#fff", borderColor: "#eee", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", fontSize: "12px" }}
                        />
                        <Area type="monotone" dataKey="Team Size" stroke="#635BFF" strokeWidth={2} fill="url(#gradTeam)" dot={{ fill: "#635BFF", r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fundraising Snapshot (Replacing Morale) */}
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl flex flex-col justify-center">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-6 h-6 text-[#F5A623]" />
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-400">Current Fundraising</p>
                </div>
                <div className="flex items-center justify-between">
                  {latest?.fundraising_status ? (
                    <div className="space-y-4">
                      <Badge className={`text-xl px-5 py-2.5 font-bold border-0 rounded-2xl ${fundraisingStyle?.bg} ${fundraisingStyle?.text}`}>
                        {latest.fundraising_status}
                      </Badge>
                      <p className="text-sm text-gray-400 font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#00D395]" /> 
                        Updated on {formatMonthLabel(latest.month)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-300 italic text-lg">Not set</p>
                  )}
                  <div className="h-20 w-20 rounded-full border-8 border-gray-50 border-t-[#F5A623] animate-spin-slow"></div>
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Spend Breakdown History */}
          {spendChartData.some((d) => d.Salaries > 0 || d.Infra > 0 || d.Marketing > 0 || d.Ops > 0) && (
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Spend Breakdown History</CardTitle>
                <CardDescription className="text-gray-500">Monthly expense categories over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendChartData} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#999", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#999", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", borderColor: "#eee", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", fontSize: "12px" }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                      <Bar dataKey="Salaries" stackId="a" fill="#00D395" radius={[0, 0, 0, 0]} barSize={20} />
                      <Bar dataKey="Infra" stackId="a" fill="#635BFF" barSize={20} />
                      <Bar dataKey="Marketing" stackId="a" fill="#F5A623" barSize={20} />
                      <Bar dataKey="Ops" stackId="a" fill="#FF4D4F" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Acquisition vs Churn */}
          {userChartData.some((d) => d["New"] > 0 || d["Churned"] > 0) && (
            <Card className="bg-white border-gray-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Customer Acquisition vs Churn</CardTitle>
                <CardDescription className="text-gray-500">New customers vs churned customers each month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userChartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#999", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#999", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", borderColor: "#eee", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", fontSize: "12px" }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                      <Bar dataKey="New" fill="#00D395" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="Churned" fill="#FF4D4F" radius={[4, 4, 0, 0]} barSize={20} opacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refined Metric History (Standalone Custom Metrics) */}
          <Card className="bg-white border-gray-100 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="pb-6 border-b border-gray-50 bg-gray-50/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-[#1A1A1A] tracking-tight flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#F5A623] fill-[#F5A623]" />
                    Metrics & KPIs
                  </CardTitle>
                  <CardDescription className="text-gray-500 font-medium">Your uniquely defined startup performance indicators.</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <Input 
                    placeholder="Filter by name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 border-gray-200 rounded-xl bg-white w-full sm:w-64 text-sm" 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="text-left px-8 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Name</th>
                      <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Description</th>
                      <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Category</th>
                      <th className="text-right px-8 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customMetrics
                      .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((m, idx) => (
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-[#F9F6F2]/50 transition-all group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#1A1A1A] font-bold text-xs group-hover:scale-110 transition-transform">
                                {m.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-[#1A1A1A]">{m.name}</p>
                                <p className="text-[10px] text-[#00D395] font-bold uppercase tracking-widest">
                                  {m.currentValue ? `${m.currentValue} ${m.unit}` : "No data logged"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-gray-500 font-medium line-clamp-1 max-w-xs">{m.description || "—"}</p>
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-gray-200 bg-white px-2 py-0.5">
                              {m.category}
                            </Badge>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <p className="text-xs font-bold text-gray-400">
                              {m.lastUpdated ? timeAgoStr(m.lastUpdated) : "Never"}
                            </p>
                          </td>
                        </tr>
                      ))}
                    {customMetrics.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center">
                            <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 text-gray-300">
                              <Plus className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-[#1A1A1A]">No custom metrics defined yet</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-xs">Start by creating your own unique KPIs to track what matters most to your startup.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
