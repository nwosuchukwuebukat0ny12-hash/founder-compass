import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Target, MessageSquare, Zap, Calendar, Rocket, Clock } from "lucide-react";
import { PulseCelebration } from "@/components/PulseCelebration";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  // Form State
  const [formData, setFormData] = useState({
    mrr: "",
    revenueTarget: "",
    monthlyBurn: "",
    cashInBank: "",
    activeUsers: "",
    teamSize: "",
    fundraising: "",
    spendSalaries: "0",
    spendInfra: "0",
    spendMarketing: "0",
    spendOps: "0",
    newCustomers: "",
    lostCustomers: ""
  });

  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  const submitPulse = useMutation({
    mutationFn: async () => {
      if (!startup) throw new Error("Startup not loaded");
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Calculate total expenses from breakdown if showBreakdown is true, otherwise use monthlyBurn field
      const totalMonthlyExpenses = showBreakdown 
        ? (parseFloat(formData.spendSalaries) || 0) + 
          (parseFloat(formData.spendInfra) || 0) + 
          (parseFloat(formData.spendMarketing) || 0) + 
          (parseFloat(formData.spendOps) || 0)
        : (parseFloat(formData.monthlyBurn) || 0);

      // 1. Submit Pulse Record
      const { error: pulseError } = await supabase.from("pulses").insert({
        startup_id: startup.id,
        founder_id: user?.id,
        month: currentMonth,
        mrr: parseFloat(formData.mrr) || 0,
        target_mrr: parseFloat(formData.revenueTarget) || 0,
        expenses: totalMonthlyExpenses,
        cash_in_bank: parseFloat(formData.cashInBank) || 0,
        active_users: parseInt(formData.activeUsers) || 0,
        team_size: parseInt(formData.teamSize) || 0,
        fundraising_status: formData.fundraising,
        spend_salaries: parseFloat(formData.spendSalaries) || 0,
        spend_infra: parseFloat(formData.spendInfra) || 0,
        spend_marketing: parseFloat(formData.spendMarketing) || 0,
        spend_ops: parseFloat(formData.spendOps) || 0,
        new_users: parseInt(formData.newCustomers) || 0,
        lost_users: parseInt(formData.lostCustomers) || 0,
      });

      if (pulseError) throw pulseError;

      // 2. Update Startup Runway Calculation
      const runway = totalMonthlyExpenses > 0 
        ? Math.round((parseFloat(formData.cashInBank) || 0) / totalMonthlyExpenses) 
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
  
  const metricConfig = (startup?.metric_config as string[]) || [];
  const spendLabels = metricConfig.length > 4 ? metricConfig.slice(metricConfig.length - 4) : ["Salaries & Talent", "Software & Infra", "Growth & Marketing", "Ops & Admin"];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 px-4 sm:px-6 lg:px-0">
      {/* Header Section */}
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1A1A1A] font-serif">
          Reporting Hub
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed max-w-3xl">
          Keep <strong className="text-[#00D395]">{startup.name}</strong>'s momentum visible. Submit your monthly numbers.
        </p>
      </div>

      {isSuccess && <PulseCelebration onDismiss={() => setIsSuccess(false)} />}

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
              <div className="space-y-2">
                <Label htmlFor="mrr" className="text-gray-600 font-semibold">Monthly Revenue / MRR ({sym})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
                  <Input
                    id="mrr"
                    type="number"
                    placeholder="0"
                    className="pl-8 bg-white border-gray-200 text-[#1A1A1A]"
                    value={formData.mrr}
                    onChange={(e) => handleInputChange('mrr', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenueTarget" className="text-gray-600 font-semibold">Next Month's Target ({sym})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
                  <Input
                    id="revenueTarget"
                    type="number"
                    placeholder="0"
                    className="pl-8 bg-white border-gray-200 text-[#1A1A1A]"
                    value={formData.revenueTarget}
                    onChange={(e) => handleInputChange('revenueTarget', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="monthlyBurn" className="text-gray-600 font-semibold">Gross Burn ({sym})</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="h-auto p-0 text-[10px] uppercase tracking-widest font-bold text-[#635BFF]"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                  >
                    {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
                  </Button>
                </div>
                {!showBreakdown ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
                    <Input
                      id="monthlyBurn"
                      type="number"
                      placeholder="0"
                      className="pl-8 bg-white border-gray-200 text-[#1A1A1A]"
                      value={formData.monthlyBurn}
                      onChange={(e) => handleInputChange('monthlyBurn', e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">{spendLabels[0]}</Label>
                        <Input type="number" className="h-8 text-sm" value={formData.spendSalaries} onChange={(e) => handleInputChange('spendSalaries', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">{spendLabels[1]}</Label>
                        <Input type="number" className="h-8 text-sm" value={formData.spendInfra} onChange={(e) => handleInputChange('spendInfra', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">{spendLabels[2]}</Label>
                        <Input type="number" className="h-8 text-sm" value={formData.spendMarketing} onChange={(e) => handleInputChange('spendMarketing', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">{spendLabels[3]}</Label>
                        <Input type="number" className="h-8 text-sm" value={formData.spendOps} onChange={(e) => handleInputChange('spendOps', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashInBank" className="text-gray-600 font-semibold">Cash in Bank ({sym})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
                  <Input
                    id="cashInBank"
                    type="number"
                    placeholder="0"
                    className="pl-8 bg-white border-gray-200 text-[#1A1A1A]"
                    value={formData.cashInBank}
                    onChange={(e) => handleInputChange('cashInBank', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION B: GROWTH & TEAM */}
          <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg font-bold text-[#1A1A1A] flex items-center">
                <Target className="w-5 h-5 mr-3 text-[#F5A623]" />
                2. Momentum & Team
              </CardTitle>
              <CardDescription className="text-gray-500 font-medium">Tracking your user base and organizational growth.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="activeUsers" className="text-gray-600 font-semibold">Total Active Users / Customers</Label>
                  <Input
                    id="activeUsers"
                    type="number"
                    placeholder="0"
                    className="bg-white border-gray-200 text-[#1A1A1A]"
                    value={formData.activeUsers}
                    onChange={(e) => handleInputChange('activeUsers', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamSize" className="text-gray-600 font-semibold">Total Team Size (FTEs)</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    placeholder="1"
                    className="bg-white border-gray-200 text-[#1A1A1A]"
                    value={formData.teamSize}
                    onChange={(e) => handleInputChange('teamSize', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-50">
                <Label htmlFor="fundraising" className="text-gray-600 font-semibold">Are you currently fundraising?</Label>
                <Select onValueChange={(val) => handleInputChange('fundraising', val)}>
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
            </CardContent>
            <CardFooter className="bg-gray-50/50 pt-6 pb-6 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium">Wins, blockers & asks? Post them in <strong className="text-[#635BFF]">Updates History</strong>.</p>
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
    </div>
  );
}
