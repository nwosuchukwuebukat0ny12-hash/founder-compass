import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingDown, TrendingUp, ShieldCheck, Plus, Loader2,
  ArrowUpRight, ArrowDownRight, Wallet, DollarSign, BarChart3,
  Filter, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────────────
type Timeframe = "daily" | "weekly" | "monthly";
type TxType = "income" | "expense";

type Transaction = {
  id: string;
  startup_id: string | null;
  user_id: string | null;
  type: string | null;
  category: string | null;
  amount: number;
  date: string | null;
  description: string | null;
  created_at: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isWithinDays(dateStr: string, days: number): boolean {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

function timeAgoStr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const INCOME_CATEGORIES = ["Sales", "Investment", "Grant", "Loan", "Other Income"];
const EXPENSE_CATEGORIES = ["Salaries", "Software", "Rent", "Marketing", "Operations", "Other Expense"];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function FounderFinancialsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [showForm, setShowForm] = useState(false);
  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);

  // ── Fetch startup ──────────────────────────────────────────────────────────
  const { data: startup, isLoading: isStartupLoading } = useQuery({
    queryKey: ["startup-financials-page", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("startup_id")
        .eq("id", user.id)
        .single();
      if (!profile?.startup_id) return null;
      const { data, error } = await supabase
        .from("startups")
        .select("id, name, currency")
        .eq("id", profile.startup_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const sym = startup?.currency === "NGN" ? "₦" : startup?.currency === "GBP" ? "£" : startup?.currency === "EUR" ? "€" : "$";

  // ── Fetch transactions ─────────────────────────────────────────────────────
  const { data: transactions = [], isLoading: isTxLoading } = useQuery<Transaction[]>({
    queryKey: ["startup-transactions", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("startup_id", startup.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  // ── Fetch pulses for the Net Burn fix ──────────────────────────────────────
  const { data: pulses = [] } = useQuery({
    queryKey: ["pulses-financials", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase
        .from("pulses")
        .select("mrr, expenses, cash_in_bank, month")
        .eq("startup_id", startup.id)
        .order("month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  // ── Submit a transaction ───────────────────────────────────────────────────
  const addTx = useMutation({
    mutationFn: async () => {
      if (!startup?.id || !amount || !txDate) throw new Error("Please fill all required fields.");
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) throw new Error("Amount must be a positive number.");
      const payload = {
        startup_id: startup.id,
        user_id: user?.id,
        type: txType,
        category: category || null,
        description: description || null,
        amount: val,
        date: txDate,
      };
      const { error } = await supabase.from("transactions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["startup-transactions", startup?.id] });
      toast({ title: "Transaction logged! ✅", description: "Your ledger has been updated." });
      setShowForm(false);
      setAmount("");
      setCategory("");
      setDescription("");
      setTxDate(new Date().toISOString().split("T")[0]);
    },
    onError: (err: any) => {
      toast({ title: "Failed to log", description: err.message, variant: "destructive" });
    },
  });

  // ── Aggregate KPIs ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    // Filter transactions by timeframe
    const filtered = transactions.filter((tx) => {
      if (!tx.date) return false;
      if (timeframe === "daily") return isWithinDays(tx.date, 1);
      if (timeframe === "weekly") return isWithinDays(tx.date, 7);
      return isWithinDays(tx.date, 30);
    });

    const totalIncome = filtered.filter(t => t.type === "income").reduce((s, tx) => s + tx.amount, 0);
    const totalExpenses = filtered.filter(t => t.type === "expense").reduce((s, tx) => s + tx.amount, 0);
    const profit = totalIncome - totalExpenses;

    // Net Burn fix: use pulses if no transactions
    const latestPulse = pulses[0] || null;
    const netBurnFromPulse = latestPulse
      ? Math.max(0, (latestPulse.expenses || 0) - (latestPulse.mrr || 0))
      : 0;

    const netBurn = transactions.length > 0
      ? Math.max(0, totalExpenses - totalIncome)
      : netBurnFromPulse;

    return { totalIncome, totalExpenses, profit, netBurn };
  }, [transactions, pulses, timeframe]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (timeframe === "daily") {
      // Last 14 days
      const days: Record<string, { label: string; income: number; expenses: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        days[key] = { label: d.toLocaleDateString("default", { month: "short", day: "numeric" }), income: 0, expenses: 0 };
      }
      transactions.forEach((tx) => {
        const k = tx.date?.split("T")[0] || "";
        if (days[k]) {
          if (tx.type === "income") days[k].income += tx.amount;
          if (tx.type === "expense") days[k].expenses += tx.amount;
        }
      });
      return Object.values(days);
    }
    if (timeframe === "weekly") {
      // Last 8 weeks
      const weeks: Record<number, { label: string; income: number; expenses: number }> = {};
      for (let i = 7; i >= 0; i--) {
        weeks[i] = { label: `W-${i}`, income: 0, expenses: 0 };
      }
      transactions.forEach((tx) => {
        if (!tx.date) return;
        const diff = Math.floor((Date.now() - new Date(tx.date).getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (diff >= 0 && diff <= 7) {
          if (tx.type === "income") weeks[diff].income += tx.amount;
          if (tx.type === "expense") weeks[diff].expenses += tx.amount;
        }
      });
      return Object.values(weeks).reverse();
    }
    // Monthly: last 12 months grouped (Merging Pulse baseline + Transaction additions)
    const months: Record<string, { label: string; income: number; expenses: number }> = {};
    
    // 1. Baseline from Pulses (Reported Snapshots)
    pulses.forEach((p) => {
      const d = new Date(p.month);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = {
        label: d.toLocaleDateString("default", { month: "short", year: "numeric" }),
        income: p.mrr || 0,
        expenses: p.expenses || 0,
      };
    });

    // 2. Add Transactions (Granular Ledger Items)
    transactions.forEach((tx) => {
      if (!tx.date) return;
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) {
        months[key] = { label: d.toLocaleDateString("default", { month: "short", year: "numeric" }), income: 0, expenses: 0 };
      }
      if (tx.type === "income") months[key].income += tx.amount;
      if (tx.type === "expense") months[key].expenses += tx.amount;
    });

    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [transactions, pulses, timeframe]);

  const fmt = (val: number) => {
    if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${sym}${(val / 1_000).toFixed(1)}k`;
    return `${sym}${val.toFixed(0)}`;
  };

  if (isStartupLoading || isTxLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="animate-spin text-[#00D395] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#00D395] mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Financial Cockpit</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Financials</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Income · Expenses · Net Burn · Profit</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { setTxType("income"); setShowForm(true); }}
            className="bg-[#00D395] hover:bg-[#00A389] text-white text-xs font-bold rounded-xl px-4 h-10 gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Income
          </Button>
          <Button
            onClick={() => { setTxType("expense"); setShowForm(true); }}
            variant="outline"
            className="border-[#FF4D4F]/40 text-[#FF4D4F] hover:bg-[#FF4D4F]/5 text-xs font-bold rounded-xl px-4 h-10 gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Income", value: fmt(kpis.totalIncome), icon: TrendingUp, color: "#00D395", bg: "bg-[#00D395]/8" },
          { label: "Total Expenses", value: fmt(kpis.totalExpenses), icon: TrendingDown, color: "#FF4D4F", bg: "bg-[#FF4D4F]/8" },
          {
            label: "Profit",
            value: fmt(Math.abs(kpis.profit)),
            prefix: kpis.profit < 0 ? "-" : "+",
            icon: kpis.profit >= 0 ? ArrowUpRight : ArrowDownRight,
            color: kpis.profit >= 0 ? "#00D395" : "#FF4D4F",
            bg: kpis.profit >= 0 ? "bg-[#00D395]/8" : "bg-[#FF4D4F]/8",
          },
          { label: "Net Burn", value: fmt(kpis.netBurn), icon: Wallet, color: "#F5A623", bg: "bg-[#F5A623]/8" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-white border-gray-100 shadow-sm rounded-2xl">
            <CardContent className="p-4 space-y-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{kpi.label}</p>
              <p className="text-xl font-bold text-[#1A1A1A] tabular-nums">
                {"prefix" in kpi ? kpi.prefix : ""}{kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Revenue vs Expenses Chart ── */}
      <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 pb-4 bg-gray-50/50">
          <div>
            <CardTitle className="text-base font-bold text-[#1A1A1A]">Income vs Expenses</CardTitle>
            <CardDescription className="text-xs text-gray-500">Real cash flow over time</CardDescription>
          </div>
          {/* Timeframe Toggle */}
          <div className="flex bg-gray-100 rounded-full p-0.5 gap-0.5">
            {(["daily", "weekly", "monthly"] as Timeframe[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${
                  timeframe === t ? "bg-white text-[#1A1A1A] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "daily" ? "Day" : t === "weekly" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[280px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" stroke="#999" tick={{ fill: "#999", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#999" tick={{ fill: "#999", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#eee", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", fontSize: 12 }}
                    cursor={{ fill: "#f9f9f9" }}
                    formatter={(val: number) => fmt(val)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "16px", color: "#666" }} />
                  <Bar dataKey="income" name="Income" fill="#00D395" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#FF4D4F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-400 font-medium border border-dashed border-gray-200 rounded-xl">
                Log your first transaction to see your chart
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Ledger ── */}
      <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 pb-4 bg-gray-50/50">
          <div>
            <CardTitle className="text-base font-bold text-[#1A1A1A]">Transaction Ledger</CardTitle>
            <CardDescription className="text-xs text-gray-500">Every dollar logged, chronologically</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-bold">{transactions.length} entries</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No transactions logged yet.</p>
              <p className="text-xs text-gray-300 mt-1">Click "Add Income" or "Add Expense" to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map((tx) => {
                const isIncome = tx.type === "income";
                return (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isIncome ? "bg-[#00D395]/10" : "bg-[#FF4D4F]/10"}`}>
                        {isIncome
                          ? <ArrowUpRight className="w-4 h-4 text-[#00D395]" />
                          : <ArrowDownRight className="w-4 h-4 text-[#FF4D4F]" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">{tx.category || (isIncome ? "Income" : "Expense")}</p>
                        <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          {tx.description && <span className="text-gray-500 mr-1">{tx.description} ·</span>}
                          <Calendar className="w-2.5 h-2.5" />
                          {tx.date ? new Date(tx.date).toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          {tx.created_at && <span className="opacity-50">· {timeAgoStr(tx.created_at)}</span>}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold tabular-nums ${isIncome ? "text-[#00D395]" : "text-[#FF4D4F]"}`}>
                      {isIncome ? "+" : "-"}{fmt(tx.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Transaction Modal ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl bg-white border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1A1A]">
              {txType === "income" ? "💰 Log Income" : "💸 Log Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Type Toggle */}
            <div className="flex bg-gray-100 rounded-full p-0.5 gap-0.5">
              {(["income", "expense"] as TxType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxType(t)}
                  className={`flex-1 text-xs font-bold py-2 rounded-full transition-all capitalize ${
                    txType === t
                      ? t === "income"
                        ? "bg-[#00D395] text-white shadow-sm"
                        : "bg-[#FF4D4F] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{sym}</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 rounded-xl border-gray-200 focus:ring-[#00D395]/50 text-[#1A1A1A] font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl border-gray-200 text-[#1A1A1A]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date *</Label>
              <Input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="rounded-xl border-gray-200 text-[#1A1A1A]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description</Label>
              <Input
                placeholder="e.g. AWS Cloud Invoice — May"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-gray-200 text-[#1A1A1A]"
              />
            </div>

            <Button
              onClick={() => addTx.mutate()}
              disabled={addTx.isPending || !amount || !txDate}
              className={`w-full font-bold rounded-xl h-11 text-sm transition-all ${
                txType === "income"
                  ? "bg-[#00D395] hover:bg-[#00A389] text-white"
                  : "bg-[#FF4D4F] hover:bg-[#cc3b3d] text-white"
              }`}
            >
              {addTx.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {addTx.isPending ? "Saving..." : `Log ${txType === "income" ? "Income" : "Expense"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
