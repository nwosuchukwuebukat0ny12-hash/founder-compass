import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Rocket, TrendingUp, Target, MessageSquare, Zap, Calendar, CheckCircle2, Clock } from "lucide-react";
import { PulseCelebration } from "@/components/PulseCelebration";
import { toast } from "@/hooks/use-toast";

export default function FounderUpdatesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: startup, isLoading } = useQuery({
    queryKey: ["founder-startup-pulse", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("startup_id").eq("id", user!.id).single();
      if (!profile?.startup_id) throw new Error("No startup linked");
      const { data: startupData } = await supabase.from("startups").select("*").eq("id", profile.startup_id).single();
      return startupData;
    },
    enabled: !!user,
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"monthly" | "weekly">("monthly");
  const [weeklyWin, setWeeklyWin] = useState("");
  const [weeklyRevenue, setWeeklyRevenue] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    cashInBank: "",
    teamSize: "",
    fundraising: "",
    win: "",
    blocker: "",
    ask: "",
    spendSalaries: "0",
    spendInfra: "0",
    spendMarketing: "0",
    spendOps: "0"
  });

  const [metrics, setMetrics] = useState<Record<string, string>>({});

  useEffect(() => {
    if (startup?.metric_config) {
      const initial: Record<string, string> = {};
      (startup.metric_config as string[]).forEach(m => initial[m] = "");
      setMetrics(initial);
    } else if (startup) {
      // Fallback for old accounts
      setMetrics({
        "MRR": "",
        "Monthly Burn": "",
        "Active Users": ""
      });
    }
  }, [startup]);

  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Weekly Vitals
  const { data: weeklyHistory = [] } = useQuery({
    queryKey: ["weekly-vitals", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase.from("weekly_vitals").select("*").eq("startup_id", startup.id).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  const { data: pulseHistory = [] } = useQuery({
    queryKey: ["pulse-history", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase.from("pulses").select("month, mrr, expenses, win, created_at").eq("startup_id", startup.id).order("month", { ascending: false }).limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  const submitWeeklyVital = useMutation({
    mutationFn: async () => {
      if (!startup) throw new Error("Startup not loaded");
      const weekStart = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("weekly_vitals").insert({
        startup_id: startup.id,
        founder_id: user?.id,
        week_start: weekStart,
        revenue: parseFloat(weeklyRevenue) || 0,
        top_win: weeklyWin,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-vitals"] });
      setWeeklyWin("");
      setWeeklyRevenue("");
      toast({ title: "Weekly Vital Logged! 🔥", description: "Your momentum is tracked." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
  });

  const submitPulse = useMutation({
    mutationFn: async () => {
      if (!startup) throw new Error("Startup not loaded");
      
      const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      // Extract core financials if they exist in custom metrics
      const mrrKey = Object.keys(metrics).find(k => k.toLowerCase().includes('revenue') || k.toLowerCase().includes('mrr'));
      const expenseKey = Object.keys(metrics).find(k => k.toLowerCase().includes('expense') || k.toLowerCase().includes('burn'));
      const mrrValue = mrrKey ? parseFloat(metrics[mrrKey]) || 0 : 0;
      const expenseValue = expenseKey ? parseFloat(metrics[expenseKey]) || 0 : 0;

      // 1. Insert the detailed pulse report
      const { error: pulseError } = await supabase.from("pulses").insert({
        startup_id: startup.id,
        founder_id: user?.id,
        month: currentMonthStr,
        mrr: mrrValue,
        expenses: expenseValue,
        cash_in_bank: parseFloat(formData.cashInBank) || 0,
        custom_kpis: metrics,
        team_size: parseInt(formData.teamSize) || 0,
        win: formData.win,
        blocker: formData.blocker,
        ask: formData.ask,
        fundraising_status: formData.fundraising,
        spend_salaries: parseFloat(formData.spendSalaries) || 0,
        spend_infra: parseFloat(formData.spendInfra) || 0,
        spend_marketing: parseFloat(formData.spendMarketing) || 0,
        spend_ops: parseFloat(formData.spendOps) || 0
      });

      if (pulseError) throw pulseError;

      // 2. Sync the latest metrics back to the 'startups' table for fast list-view access
      const runway = expenseValue > 0 
        ? Math.round((parseFloat(formData.cashInBank) || 0) / expenseValue) 
        : 99; // Infinity or high number

      const { error: startupError } = await supabase.from("startups").update({
        runway_months: runway,
        updated_at: new Date().toISOString(),
        is_delayed: false // Mark as updated
      } as any).eq("id", startup.id);

      if (startupError) throw startupError;
    },
    onSuccess: () => {
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["startup-pulses", startup?.id] });
      queryClient.invalidateQueries({ queryKey: ["founder-startup-pulse", user?.id] });
      toast({ title: "Pulse Submitted!", description: "The Lab has been updated with your progress." });
    },
    onError: (error: any) => {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPulse.mutate();
  };

  if (isLoading) return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="animate-spin text-[#00D395]" /></div>;
  if (!startup) return <div className="p-12 text-center text-[#1A1A1A]">Startup not found</div>;

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const sym = startup.currency === 'NGN' ? '₦' : startup.currency === 'GBP' ? '£' : startup.currency === 'EUR' ? '€' : '$';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* Header Section */}
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1A1A1A] font-serif">
          Reporting Hub
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed max-w-3xl">
          Keep <strong className="text-[#00D395]">{startup.name}</strong>'s momentum visible. Submit your numbers and wins.
        </p>
      </div>

      {isSuccess && <PulseCelebration onDismiss={() => setIsSuccess(false)} />}

      {/* TAB SWITCHER */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-full w-fit">
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
            activeTab === "monthly"
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-gray-500 hover:text-[#1A1A1A]"
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />Monthly Pulse
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
            activeTab === "weekly"
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-gray-500 hover:text-[#1A1A1A]"
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />Weekly Vital
        </button>
      </div>

      {/* MONTHLY PULSE TAB */}
      {activeTab === "monthly" && (
      <div className="space-y-6">
        <div className="p-5 rounded-xl bg-white border border-gray-200 border-l-4 border-l-[#00D395] shadow-sm">
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong className="text-[#1A1A1A] font-bold">Your Monthly Pulse is a quick 2-minute check-in</strong> that helps the Lab stay aligned with your progress. 
            The insights you share here directly inform your growth metrics and give us a clear view of what’s working, where challenges exist, and how we can support you effectively.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECTION A: HARD NUMBERS */}
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg font-bold text-[#1A1A1A] flex items-center">
                <TrendingUp className="w-5 h-5 mr-3 text-[#00D395]" />
                1. The Hard Numbers
              </CardTitle>
              <CardDescription className="text-gray-500 font-medium">Financial and growth metrics for {currentMonth}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(metrics).map((metricName, index) => {
                const isFinancial = metricName.toLowerCase().includes('revenue') || metricName.toLowerCase().includes('expense') || metricName.toLowerCase().includes('mrr') || metricName.toLowerCase().includes('burn') || metricName.toLowerCase().includes('cost');
                return (
                  <div key={index} className="space-y-2">
                    <Label className="text-gray-600 font-semibold">{metricName}</Label>
                    <div className="relative">
                      {isFinancial && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
                      )}
                      <Input 
                        type="number" 
                        placeholder="0" 
                        className={`${isFinancial ? 'pl-8' : ''} bg-white border-gray-200 text-[#1A1A1A]`} 
                        required
                        value={metrics[metricName]}
                        onChange={(e) => setMetrics(prev => ({ ...prev, [metricName]: e.target.value }))}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cashInBank" className="text-gray-600 font-semibold">Total Cash in Bank ({sym})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
                  <Input 
                    id="cashInBank" 
                    type="number" 
                    placeholder="Total current liquidity" 
                    className="pl-8 bg-white border-gray-200 text-[#1A1A1A]" 
                    required
                    value={formData.cashInBank}
                    onChange={(e) => handleInputChange('cashInBank', e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Crucial for calculating your current runway.</p>
              </div>

              <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-600 font-bold uppercase tracking-tight">Spend Breakdown</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-[#00D395] font-bold text-xs hover:bg-[#00D395]/5"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                  >
                    {showBreakdown ? "Hide Details" : "Show Details (Optional)"}
                  </Button>
                </div>

                {showBreakdown && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <Label htmlFor="spendSalaries" className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Salaries & Talent</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{sym}</span>
                        <Input 
                          id="spendSalaries" 
                          type="number" 
                          className="pl-6 bg-white border-gray-200 h-9 text-sm" 
                          value={formData.spendSalaries}
                          onChange={(e) => handleInputChange('spendSalaries', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="spendInfra" className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Software & Infra</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{sym}</span>
                        <Input 
                          id="spendInfra" 
                          type="number" 
                          className="pl-6 bg-white border-gray-200 h-9 text-sm" 
                          value={formData.spendInfra}
                          onChange={(e) => handleInputChange('spendInfra', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="spendMarketing" className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Growth & Marketing</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{sym}</span>
                        <Input 
                          id="spendMarketing" 
                          type="number" 
                          className="pl-6 bg-white border-gray-200 h-9 text-sm" 
                          value={formData.spendMarketing}
                          onChange={(e) => handleInputChange('spendMarketing', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="spendOps" className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Ops & Admin</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{sym}</span>
                        <Input 
                          id="spendOps" 
                          type="number" 
                          className="pl-6 bg-white border-gray-200 h-9 text-sm" 
                          value={formData.spendOps}
                          onChange={(e) => handleInputChange('spendOps', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-50">
                <Label htmlFor="teamSize" className="text-gray-600 font-semibold">Team Size (Headcount)</Label>
                <Input 
                  id="teamSize" 
                  type="number" 
                  placeholder="Total staff" 
                  className="bg-white border-gray-200 text-[#1A1A1A]" 
                  required
                  value={formData.teamSize}
                  onChange={(e) => handleInputChange('teamSize', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION B: THE NARRATIVE */}
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg font-bold text-[#1A1A1A] flex items-center">
                <Target className="w-5 h-5 mr-3 text-[#F5A623]" />
                2. The Narrative
              </CardTitle>
              <CardDescription className="text-gray-500 font-medium">Context behind the numbers.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="fundraising" className="text-gray-600 font-semibold">Are you currently fundraising?</Label>
                <Select required onValueChange={(val) => handleInputChange('fundraising', val)}>
                  <SelectTrigger className="bg-white border-gray-200 text-[#1A1A1A]">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-[#1A1A1A]">
                    <SelectItem value="yes">Yes, actively raising</SelectItem>
                    <SelectItem value="planning">Planning to raise in &lt;6 months</SelectItem>
                    <SelectItem value="no">No, we have enough runway</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="win" className="text-gray-600 font-semibold">Biggest Win This Month</Label>
                <Textarea 
                  id="win" 
                  placeholder="e.g. Closed a $50k enterprise deal, or shipped the mobile app." 
                  className="bg-white border-gray-200 text-[#1A1A1A] min-h-[100px] resize-y" 
                  required
                  value={formData.win}
                  onChange={(e) => handleInputChange('win', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blocker" className="text-gray-600 font-semibold flex items-center justify-between">
                  <span>Biggest Blocker <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px] ml-2">(Optional)</span></span>
                </Label>
                <Textarea 
                  id="blocker" 
                  placeholder="e.g. Struggling to hire a lead engineer." 
                  className="bg-white border-gray-200 text-[#1A1A1A] min-h-[100px] resize-y" 
                  value={formData.blocker}
                  onChange={(e) => handleInputChange('blocker', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION C: THE LAB ASK */}
          <Card className="bg-[#00D395]/5 border-[#00D395]/20 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-[#00D395]/10 bg-[#00D395]/10">
              <CardTitle className="text-lg font-bold text-[#1A1A1A] flex items-center">
                <MessageSquare className="w-5 h-5 mr-3 text-[#00D395]" />
                3. How Can We Help?
              </CardTitle>
              <CardDescription className="text-[#00D395]/80 font-medium">The most important field in this form.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="ask" className="text-gray-700 text-base font-bold">What is ONE specific thing the Lab can help you with right now?</Label>
                <p className="text-xs text-gray-500 mb-2 font-medium">Be specific: "Intros to Seed investors in Fintech" or "Feedback on our new pricing model."</p>
                <Textarea 
                  id="ask" 
                  placeholder="I need help with..." 
                  className="bg-white border-white shadow-sm text-[#1A1A1A] min-h-[120px] resize-y focus-visible:ring-[#00D395]" 
                  required
                  value={formData.ask}
                  onChange={(e) => handleInputChange('ask', e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-[#00D395]/10 pt-6 pb-6 border-t border-[#00D395]/10 flex justify-end">
              <Button 
                type="submit" 
                disabled={submitPulse.isPending} 
                className="bg-[#00D395] hover:bg-[#00A389] text-white px-8 shadow-md rounded-full font-bold"
              >
                {submitPulse.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Pulse...</>
                ) : (
                  <><Rocket className="mr-2 h-4 w-4" /> Submit {currentMonth} Pulse</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* PULSE HISTORY */}
        {pulseHistory.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Previous Pulses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pulseHistory.map((pulse: any, idx: number) => (
                <div key={idx} className={`px-6 py-4 flex items-center justify-between ${idx !== pulseHistory.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">{pulse.month}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-xs">{pulse.win || 'No win logged'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#00D395]">{sym}{((pulse.mrr || 0) / 1000).toFixed(1)}k</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Revenue</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {/* WEEKLY VITALS TAB */}
      {activeTab === "weekly" && (
      <div className="space-y-6">
        <div className="p-5 rounded-xl bg-white border border-gray-200 border-l-4 border-l-[#F5A623] shadow-sm">
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong className="text-[#1A1A1A] font-bold">Your Weekly Vital is a 30-second Friday check-in.</strong> Log your revenue pulse and biggest win to keep momentum visible to the Lab and yourself.
          </p>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-lg font-bold text-[#1A1A1A] flex items-center">
              <Zap className="w-5 h-5 mr-3 text-[#F5A623]" />
              Friday Check-in
            </CardTitle>
            <CardDescription className="text-gray-500 font-medium">Week of {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-600 font-semibold">Revenue This Week ({sym})</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
                <Input
                  type="number"
                  placeholder="0"
                  className="pl-8 bg-white border-gray-200 text-[#1A1A1A]"
                  value={weeklyRevenue}
                  onChange={(e) => setWeeklyRevenue(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600 font-semibold">Biggest Win This Week</Label>
              <Textarea
                placeholder="e.g., Landed a pilot deal with a logistics company."
                className="bg-white border-gray-200 text-[#1A1A1A] min-h-[100px] resize-y"
                value={weeklyWin}
                onChange={(e) => setWeeklyWin(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50/50 pt-6 pb-6 border-t border-gray-100 flex justify-end">
            <Button
              onClick={() => submitWeeklyVital.mutate()}
              disabled={submitWeeklyVital.isPending || !weeklyWin.trim()}
              className="bg-[#F5A623] hover:bg-[#D4891E] text-white px-8 shadow-md rounded-full font-bold"
            >
              {submitWeeklyVital.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" /> Log Weekly Vital</>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* WEEKLY HISTORY */}
        {weeklyHistory.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Recent Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {weeklyHistory.map((vital: any, idx: number) => (
                <div key={idx} className={`px-6 py-4 flex items-center justify-between ${idx !== weeklyHistory.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">Week of {new Date(vital.week_start).toLocaleDateString()}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-xs">{vital.top_win || 'No win logged'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#F5A623]">{sym}{((vital.revenue || 0) / 1000).toFixed(1)}k</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Revenue</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      )}
    </div>
  );
}
