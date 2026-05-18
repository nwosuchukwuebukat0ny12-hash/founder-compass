import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Radar, AlertTriangle, ShieldCheck, Trophy, HelpCircle,
  Clock, TrendingDown, TrendingUp, CheckCircle2, MessageSquare, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────────────
type Startup = {
  id: string;
  name: string;
  currency: string;
  logo_url: string | null;
};

type StartupUpdate = {
  id: string;
  startup_id: string;
  title: string;
  content: string;
  created_at: string;
  is_acknowledged: boolean;
  author_id: string | null;
  startup: { name: string; logo_url: string | null } | null;
  profiles: { full_name: string | null } | null;
};

type Pulse = {
  id: string;
  startup_id: string;
  month: string;
  cash_in_bank: number | null;
  expenses: number | null;
  mrr: number | null;
};

type Transaction = {
  id: string;
  startup_id: string;
  amount: number;
  type: string; // 'income' | 'expense'
  date: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("default", { day: "numeric", month: "short" });
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function IntelligenceRadarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"runway" | "signals">("runway");
  const [selectedUpdate, setSelectedUpdate] = useState<StartupUpdate | null>(null);
  const [feedback, setFeedback] = useState("");

  // 1. Fetch all startups
  const { data: startups = [], isLoading: isLoadingStartups } = useQuery<Startup[]>({
    queryKey: ["admin-startups-radar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("id, name, currency, logo_url");
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch all latest pulses for Runway Baseline
  const { data: pulses = [], isLoading: isLoadingPulses } = useQuery<Pulse[]>({
    queryKey: ["admin-pulses-radar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pulses")
        .select("id, startup_id, month, cash_in_bank, expenses, mrr")
        .order("month", { ascending: false });
      if (error) throw error;
      
      // We only want the *latest* pulse per startup
      const latestPulsesMap = new Map<string, Pulse>();
      for (const p of data || []) {
        if (!latestPulsesMap.has(p.startup_id)) {
          latestPulsesMap.set(p.startup_id, p);
        }
      }
      return Array.from(latestPulsesMap.values());
    },
  });

  // 3. Fetch all transactions for Live Adjustment
  const { data: transactions = [], isLoading: isLoadingTx } = useQuery<Transaction[]>({
    queryKey: ["admin-transactions-radar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, startup_id, amount, type, date");
      if (error) throw error;
      return data || [];
    },
  });

  // 4. Fetch all startup updates for the Signals Feed
  const { data: signals = [], isLoading: isLoadingSignals } = useQuery<StartupUpdate[]>({
    queryKey: ["admin-signals-radar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_updates")
        .select(`
          id, title, content, created_at, is_acknowledged, startup_id, author_id,
          startup:startups(name, logo_url),
          profiles(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any) || [];
    },
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const acknowledgeUpdate = useMutation({
    mutationFn: async ({ id, feedbackText }: { id: string; feedbackText?: string }) => {
      const payload: any = { is_acknowledged: true };
      if (feedbackText && feedbackText.trim()) {
        payload.admin_feedback = feedbackText.trim();
      }
      const { error } = await supabase
        .from("startup_updates")
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      // Create a notification for the founder
      // We need the author_id of the update
      const update = signals.find((s) => s.id === id);
      if (update?.author_id) {
        await supabase.from("notifications").insert({
          user_id: update.author_id,
          title: "Lab Acknowledgment ✅",
          message: `The Lab has seen your recent update: "${update.title}".${feedbackText ? ` They left a note: "${feedbackText}"` : ''}`,
          type: "success",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-signals-radar"] });
      toast({ title: "Acknowledged! ✅", description: "The founder has been notified." });
      setSelectedUpdate(null);
      setFeedback("");
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  // ─── Calculations ──────────────────────────────────────────────────────────
  const calculateRunway = (startup: Startup) => {
    const pulse = pulses.find(p => p.startup_id === startup.id);
    const baselineCash = pulse?.cash_in_bank || 0;
    const pulseDateStr = pulse?.month || new Date().toISOString().slice(0, 7);
    const pulseDate = new Date(pulseDateStr).getTime();

    const startupTxs = transactions.filter(t => t.startup_id === startup.id);
    
    // 1. Calculate Live Cash (Pulse + Delta)
    const recentTxs = startupTxs.filter(t => new Date(t.date).getTime() >= pulseDate);
    let liveCash = baselineCash;
    recentTxs.forEach((tx) => {
      if (tx.type === "income") liveCash += tx.amount;
      if (tx.type === "expense") liveCash -= tx.amount;
    });

    // 2. Calculate Live Net Burn (Avg Expenses - Avg Income over last 3 months)
    const expenseGroups: Record<string, number> = {};
    const incomeGroups: Record<string, number> = {};
    
    startupTxs.forEach(tx => {
      const monthKey = tx.date.slice(0, 7);
      if (tx.type === 'expense') {
        expenseGroups[monthKey] = (expenseGroups[monthKey] || 0) + (tx.amount || 0);
      } else if (tx.type === 'income') {
        incomeGroups[monthKey] = (incomeGroups[monthKey] || 0) + (tx.amount || 0);
      }
    });
    
    const expValues = Object.values(expenseGroups).slice(-3);
    const incValues = Object.values(incomeGroups).slice(-3);
    
    const avgExp = expValues.length > 0 ? expValues.reduce((sum, v) => sum + v, 0) / expValues.length : (pulse?.expenses || 0);
    const avgInc = incValues.length > 0 ? incValues.reduce((sum, v) => sum + v, 0) / incValues.length : (pulse?.mrr || 0);

    const netBurn = Math.max(0, avgExp - avgInc);

    let runwayMonths = -1;
    if (avgExp > 0) {
      runwayMonths = liveCash / avgExp;
    }

    return { liveCash, netBurn, runwayMonths, pulseDate };
  };

  const isLoading = isLoadingStartups || isLoadingPulses || isLoadingTx || isLoadingSignals;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="animate-spin text-[#635BFF] w-8 h-8" />
      </div>
    );
  }

  const unreadSignals = signals.filter(s => !s.is_acknowledged).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 font-sans px-4 sm:px-6 lg:px-0 animate-in fade-in duration-500">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center shadow-lg">
            <Radar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">Intelligence Radar</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Live Runway Tracking & Signals Sync</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 p-1.5 bg-gray-100/80 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("runway")}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "runway" ? "bg-white shadow-sm text-[#1A1A1A]" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <TrendingDown className="w-4 h-4" /> Live Runway
        </button>
        <button
          onClick={() => setActiveTab("signals")}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "signals" ? "bg-white shadow-sm text-[#1A1A1A]" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Signals Feed
          {unreadSignals > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{unreadSignals}</span>
          )}
        </button>
      </div>

      {/* ── RUNWAY TAB ── */}
      {activeTab === "runway" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#1A1A1A]/5 to-transparent border border-[#1A1A1A]/10">
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-[#1A1A1A]">Dynamic Cash Tracking:</strong> Runway is calculated in real-time by taking the last reported cash balance from the Startup's Pulse, and automatically adjusting it based on every Income and Expense transaction logged since that date.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {startups.map((startup) => {
              const { liveCash, netBurn, runwayMonths, pulseDate } = calculateRunway(startup);
              const sym = startup.currency === "NGN" ? "₦" : startup.currency === "GBP" ? "£" : startup.currency === "EUR" ? "€" : "$";
              
              let statusColor = "bg-emerald-500";
              let statusBg = "bg-emerald-50";
              let statusBorder = "border-emerald-100";
              let statusText = "text-emerald-700";
              
              if (runwayMonths > 0 && runwayMonths <= 3) {
                statusColor = "bg-red-500"; statusBg = "bg-red-50"; statusBorder = "border-red-200"; statusText = "text-red-700";
              } else if (runwayMonths > 3 && runwayMonths <= 6) {
                statusColor = "bg-amber-500"; statusBg = "bg-amber-50"; statusBorder = "border-amber-200"; statusText = "text-amber-700";
              }

              return (
                <Card key={startup.id} className={`bg-white border-2 ${statusBorder} shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden relative`}>
                  <div className={`absolute top-0 left-0 w-full h-1 ${statusColor}`} />
                  <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      {startup.logo_url ? (
                        <img src={startup.logo_url} alt={startup.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                          {startup.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base font-bold text-[#1A1A1A]">{startup.name}</CardTitle>
                        <p className="text-[10px] text-gray-400 font-medium">Last Sync: {pulseDate ? new Date(pulseDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Live Cash</p>
                        <p className="text-lg font-bold text-[#1A1A1A] tabular-nums">{sym}{liveCash.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Net Burn</p>
                        <p className="text-lg font-bold text-[#1A1A1A] tabular-nums">{sym}{netBurn.toLocaleString()}/mo</p>
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-xl flex items-center justify-between ${statusBg}`}>
                      <div className="flex items-center gap-2">
                        {runwayMonths > 0 && runwayMonths <= 3 ? <AlertTriangle className={`w-4 h-4 ${statusText}`} /> : <TrendingUp className={`w-4 h-4 ${statusText}`} />}
                        <p className={`text-xs font-bold uppercase tracking-widest ${statusText}`}>Runway</p>
                      </div>
                      <p className={`text-xl font-black tabular-nums ${statusText}`}>
                        {runwayMonths < 0 ? "∞" : `${runwayMonths.toFixed(1)} mo`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SIGNALS TAB ── */}
      {activeTab === "signals" && (
        <div className="space-y-6">
          {signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />
              <h2 className="text-base font-bold text-[#1A1A1A]">No signals yet</h2>
              <p className="text-sm text-gray-400">Founders haven't posted any updates.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {signals.map((signal) => {
                const titleLower = signal.title.toLowerCase();
                const isWin = titleLower.includes("win") || titleLower.includes("victory");
                const isBlocker = titleLower.includes("blocker") || titleLower.includes("stuck") || titleLower.includes("stop");
                const isAsk = titleLower.includes("ask") || titleLower.includes("help") || titleLower.includes("request");
                
                let sColor = "emerald";
                let label = "STRATEGIC WIN";
                let Icon = Trophy;
                let gradient = "from-emerald-500/10 via-emerald-500/5 to-transparent";
                
                if (isBlocker) { 
                  sColor = "red"; 
                  label = "URGENT BLOCKER"; 
                  Icon = AlertTriangle; 
                  gradient = "from-red-500/10 via-red-500/5 to-transparent";
                } else if (isAsk) { 
                  sColor = "amber"; 
                  label = "FOUNDER REQUEST"; 
                  Icon = HelpCircle; 
                  gradient = "from-amber-500/10 via-amber-500/5 to-transparent";
                }

                const fullDate = new Date(signal.created_at).toLocaleDateString("default", { day: "numeric", month: "short" });

                return (
                  <div key={signal.id} className={`bg-white border border-gray-100 rounded-2xl hover:shadow-lg transition-all relative overflow-hidden flex flex-col group`}>
                    {/* Signal Header Banner */}
                    <div className={`h-10 px-4 flex items-center justify-between bg-gradient-to-r ${gradient} border-b border-gray-50`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 text-${sColor}-600`} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-${sColor}-700`}>
                          {label}
                        </span>
                      </div>
                      {!signal.is_acknowledged && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">New Signal</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        {signal.startup?.logo_url ? (
                          <img src={signal.startup.logo_url} alt={signal.startup.name} className="w-10 h-10 rounded-xl object-cover shadow-sm border border-gray-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">
                            {signal.startup?.name?.charAt(0) || "S"}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[#1A1A1A] leading-tight">{signal.startup?.name}</h3>
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                            {signal.profiles?.full_name || "Founder"} · {fullDate} · <Clock className="w-2.5 h-2.5" /> {timeAgo(signal.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="mb-5">
                        <p className="text-sm text-[#333] font-medium leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-50/50">
                          {signal.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        {signal.is_acknowledged ? (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Lab Seen</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setSelectedUpdate(signal)}
                            size="sm"
                            className="bg-[#1A1A1A] hover:bg-[#333] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl h-8 px-4 transition-all hover:scale-105 active:scale-95 shadow-sm"
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Acknowledge Modal ── */}
      <Dialog open={!!selectedUpdate} onOpenChange={(open) => !open && setSelectedUpdate(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl bg-white border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#635BFF]" />
              Acknowledge Signal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-100">
              <strong className="text-[#1A1A1A]">From {selectedUpdate?.startup?.name}:</strong> "{selectedUpdate?.content}"
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Optional Note back to Founder
              </label>
              <Input
                placeholder="e.g. Great job! / Let me introduce you to X..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="rounded-xl border-gray-200 focus:ring-[#635BFF]/50 text-[#1A1A1A]"
              />
            </div>

            <Button
              onClick={() => selectedUpdate && acknowledgeUpdate.mutate({ id: selectedUpdate.id, feedbackText: feedback })}
              disabled={acknowledgeUpdate.isPending}
              className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-bold rounded-xl h-11"
            >
              {acknowledgeUpdate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {acknowledgeUpdate.isPending ? "Sending..." : "Mark as Seen & Notify"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
