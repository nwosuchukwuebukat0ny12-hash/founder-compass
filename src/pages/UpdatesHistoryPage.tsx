import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Trophy, AlertTriangle, HelpCircle,
  Loader2, Send, Sparkles, Clock, Zap,
  Smile, Meh, Frown, TrendingUp, Target, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type UpdateType = "win" | "blocker" | "ask";

type StartupUpdate = {
  id: string;
  title: string;
  content: string;
  type?: string | null;
  created_at: string | null;
  is_acknowledged?: boolean | null;
  admin_feedback?: string | null;
};

const TYPE_CONFIG: Record<UpdateType, {
  label: string;
  emoji: string;
  icon: React.FC<{ className?: string }>;
  activeClass: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  placeholder: string;
}> = {
  win: {
    label: "Win",
    emoji: "🏆",
    icon: Trophy,
    activeClass: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    borderClass: "border-l-emerald-400",
    bgClass: "bg-gradient-to-br from-emerald-50/80 to-white",
    placeholder: "e.g. Closed our first enterprise deal at ₦1.5M ARR. The team is fired up 🔥",
  },
  blocker: {
    label: "Blocker",
    emoji: "🚧",
    icon: AlertTriangle,
    activeClass: "bg-red-500 text-white shadow-lg shadow-red-500/30",
    badgeClass: "bg-red-50 text-red-700 border-red-100",
    borderClass: "border-l-red-400",
    bgClass: "bg-gradient-to-br from-red-50/80 to-white",
    placeholder: "e.g. Can't close a lead engineer despite 3 months of searching. Salary expectations are 2x our range.",
  },
  ask: {
    label: "Ask",
    emoji: "🙋",
    icon: HelpCircle,
    activeClass: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-100",
    borderClass: "border-l-amber-400",
    bgClass: "bg-gradient-to-br from-amber-50/80 to-white",
    placeholder: "e.g. Looking for warm intros to Seed-stage Fintech investors in Lagos or London.",
  },
};

const MORALE_CONFIG = [
  { value: 1, label: "Burned Out", icon: Frown, color: "text-red-500", bg: "bg-red-50 border-red-200" },
  { value: 2, label: "Struggling", icon: Frown, color: "text-orange-500", bg: "bg-orange-50 border-orange-200" },
  { value: 3, label: "Steady", icon: Meh, color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
  { value: 4, label: "Energised", icon: Smile, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200" },
  { value: 5, label: "On Fire 🔥", icon: Smile, color: "text-emerald-600", bg: "bg-emerald-100 border-emerald-300" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("default", { day: "numeric", month: "short" });
}

export default function UpdatesHistoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"updates" | "weekly">("updates");
  const [selectedType, setSelectedType] = useState<UpdateType>("win");
  const [content, setContent] = useState("");

  // Weekly vitals state
  const [topWin, setTopWin] = useState("");
  const [topBlocker, setTopBlocker] = useState("");
  const [nextWeekGoal, setNextWeekGoal] = useState("");
  const [morale, setMorale] = useState(3);
  const [revenue, setRevenue] = useState("");
  const [priorities, setPriorities] = useState<string[]>(["", "", ""]);

  const { data: startup } = useQuery({
    queryKey: ["founder-startup-updates-v2", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("startup_id").eq("id", user!.id).single();
      if (!profile?.startup_id) return null;
      const { data } = await supabase.from("startups").select("id, name, currency").eq("id", profile.startup_id).single();
      return data;
    },
    enabled: !!user,
  });

  const sym = startup?.currency === 'NGN' ? '₦' : startup?.currency === 'GBP' ? '£' : startup?.currency === 'EUR' ? '€' : '$';

  const { data: updates = [], isLoading } = useQuery<StartupUpdate[]>({
    queryKey: ["startup-updates-feed", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase
        .from("startup_updates")
        .select("id, title, content, created_at, is_acknowledged, admin_feedback")
        .eq("startup_id", startup.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  const { data: weeklyHistory = [] } = useQuery({
    queryKey: ["weekly-vitals-history", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase
        .from("weekly_vitals")
        .select("*")
        .eq("startup_id", startup.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!startup?.id || !content.trim()) throw new Error("Content required");
      const cfg = TYPE_CONFIG[selectedType];
      const { error } = await supabase.from("startup_updates").insert({
        startup_id: startup.id,
        title: cfg.label,
        content: content.trim(),
        author_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["startup-updates-feed", startup?.id] });
      toast({ title: "Update posted! ✨", description: "Your update is now visible to the Lab." });
    },
    onError: (err: any) => toast({ title: "Failed to post", description: err.message, variant: "destructive" }),
  });

  const submitWeekly = useMutation({
    mutationFn: async () => {
      if (!startup?.id) throw new Error("No startup");
      const filledPriorities = priorities.filter(p => p.trim());
      const { error } = await supabase.from("weekly_vitals").insert({
        startup_id: startup.id,
        founder_id: user?.id,
        week_start: new Date().toISOString().slice(0, 10),
        revenue: parseFloat(revenue) || 0,
        top_win: topWin.trim() || null,
        top_blocker: topBlocker.trim() || null,
        next_week_goal: nextWeekGoal.trim() || null,
        morale,
        priorities: filledPriorities.length > 0 ? filledPriorities : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTopWin(""); setTopBlocker(""); setNextWeekGoal(""); setRevenue(""); setMorale(3); setPriorities(["", "", ""]);
      queryClient.invalidateQueries({ queryKey: ["weekly-vitals-history", startup?.id] });
      toast({ title: "Weekly summary submitted! 🔥", description: "The Lab is in sync with your week." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const cfg = TYPE_CONFIG[selectedType];

  return (
    <div className="max-w-2xl mx-auto font-sans pb-24 px-4 sm:px-6 lg:px-0 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-[#635BFF]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Lab Signals</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">
            Updates · Weekly Execution · Admin Sync
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-gray-100/80 rounded-2xl w-full">
        <button
          onClick={() => setActiveTab("updates")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "updates" ? "bg-white shadow-sm text-[#1A1A1A]" : "text-gray-400 hover:text-gray-600"}`}
        >
          <Sparkles className="w-4 h-4" /> Wins · Blockers · Asks
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "weekly" ? "bg-white shadow-sm text-[#1A1A1A]" : "text-gray-400 hover:text-gray-600"}`}
        >
          <Zap className="w-4 h-4" /> Weekly Summary
        </button>
      </div>

      {/* ── UPDATES TAB ── */}
      {activeTab === "updates" && (
        <div className="space-y-6">
          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex gap-2">
                {(Object.keys(TYPE_CONFIG) as UpdateType[]).map((type) => {
                  const c = TYPE_CONFIG[type];
                  const isActive = selectedType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${isActive ? c.activeClass : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      <c.icon className="w-3.5 h-3.5" />
                      {c.emoji} {c.label}
                    </button>
                  );
                })}
              </div>
              <div className={`relative rounded-xl border-l-4 ${cfg.borderClass} ${cfg.bgClass} transition-all duration-300`}>
                <Textarea
                  placeholder={cfg.placeholder}
                  className="bg-transparent border-0 resize-none min-h-[100px] text-sm text-[#1A1A1A] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 p-4"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={submit.isPending}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => submit.mutate()}
                  disabled={submit.isPending || !content.trim()}
                  className="bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-widest rounded-xl px-5 py-2.5"
                >
                  {submit.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Posting...</> : <><Send className="w-3.5 h-3.5 mr-2" />Post Update</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading && <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>}
          {!isLoading && updates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#635BFF]/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-[#635BFF]" />
              </div>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-1">No updates yet</h2>
              <p className="text-sm text-gray-400 max-w-xs">Post your first Win, Blocker, or Ask above — the Lab is listening.</p>
            </div>
          )}
          <div className="space-y-4">
            {updates.map((update) => {
              const detectedType = (update.title?.toLowerCase() || "win") as UpdateType;
              const c = TYPE_CONFIG[detectedType] || TYPE_CONFIG.win;
              const CardIcon = c.icon;
              const fullDate = update.created_at ? new Date(update.created_at).toLocaleDateString("default", { day: "numeric", month: "short" }) : "";
              
              return (
                <div key={update.id} className={`group relative rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col`}>
                  {/* Signal Header Banner */}
                  <div className={`h-10 px-4 flex items-center justify-between bg-gradient-to-r ${c.bgClass} border-b border-gray-50`}>
                    <div className="flex items-center gap-2">
                      <CardIcon className={`w-3.5 h-3.5 ${c.badgeClass.split(' ')[1]}`} />
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${c.badgeClass.split(' ')[1]}`}>
                        {detectedType === 'win' ? 'STRATEGIC WIN' : detectedType === 'blocker' ? 'URGENT BLOCKER' : 'ACTIVE REQUEST'}
                      </span>
                    </div>
                    {update.is_acknowledged && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#635BFF]" />
                        <span className="text-[9px] font-bold text-[#635BFF] uppercase tracking-widest">Lab Seen</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        {fullDate} · <Clock className="w-2.5 h-2.5" /> {update.created_at ? timeAgo(update.created_at) : "—"}
                      </p>
                    </div>

                    <p className="text-sm text-[#1A1A1A] font-medium leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-50/50">
                      {update.content}
                    </p>
                    
                    {update.admin_feedback && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#635BFF]/10 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4 text-[#635BFF]" />
                        </div>
                        <div>
                          <p className="text-[9px] text-[#635BFF] uppercase tracking-widest font-black mb-1">Lab Feedback</p>
                          <p className="text-xs text-[#555] font-medium italic leading-relaxed">"{update.admin_feedback}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WEEKLY SUMMARY TAB ── */}
      {activeTab === "weekly" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#635BFF]/5 to-transparent border border-[#635BFF]/10">
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-[#1A1A1A]">This is your Friday debrief.</strong> It takes 2 minutes and keeps the Lab fully in sync with your week — wins, blockers, morale and what's next.
            </p>
          </div>

          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-50">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Revenue This Week ({sym})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{sym}</span>
                <Input
                  type="number"
                  placeholder="0"
                  className="pl-8 bg-gray-50/50 border-gray-200 rounded-xl focus-visible:ring-[#635BFF]/20"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-50">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#635BFF]" />
                3 Things We Got Done
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#635BFF]/10 text-[#635BFF] text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <Input
                    placeholder={`e.g. ${["Launched the beta to 20 users", "Closed a pilot deal", "Hired our first engineer"][i]}`}
                    className="bg-gray-50/50 border-gray-200 rounded-xl text-sm focus-visible:ring-[#635BFF]/20"
                    value={p}
                    onChange={(e) => { const next = [...priorities]; next[i] = e.target.value; setPriorities(next); }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-emerald-400 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-50">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-500" />
                Biggest Win 🏆
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                placeholder="The one thing that made this week worth it..."
                className="bg-gray-50/50 border-gray-200 resize-none min-h-[80px] rounded-xl text-sm focus-visible:ring-emerald-200"
                value={topWin}
                onChange={(e) => setTopWin(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-red-400 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-50">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Biggest Blocker 🚧
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                placeholder="What slowed you down or stopped you this week? The Lab wants to help."
                className="bg-gray-50/50 border-gray-200 resize-none min-h-[80px] rounded-xl text-sm focus-visible:ring-red-100"
                value={topBlocker}
                onChange={(e) => setTopBlocker(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-amber-400 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-50">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                One Big Goal for Next Week
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Input
                placeholder="e.g. Close our first paying customer"
                className="bg-gray-50/50 border-gray-200 rounded-xl text-sm focus-visible:ring-amber-100"
                value={nextWeekGoal}
                onChange={(e) => setNextWeekGoal(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-50">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Smile className="w-4 h-4 text-amber-500" />
                Team Morale
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex gap-2 flex-wrap">
                {MORALE_CONFIG.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMorale(m.value)}
                    className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-xs font-bold ${morale === m.value ? m.bg + " " + m.color + " scale-105 shadow-sm" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
                  >
                    <m.icon className={`w-5 h-5 ${morale === m.value ? m.color : "text-gray-300"}`} />
                    {m.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => submitWeekly.mutate()}
            disabled={submitWeekly.isPending || (!topWin.trim() && priorities.every(p => !p.trim()))}
            className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-bold rounded-2xl py-6 text-sm uppercase tracking-widest shadow-lg"
          >
            {submitWeekly.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><Zap className="w-4 h-4 mr-2" />Submit Weekly Summary</>}
          </Button>

          {weeklyHistory.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5" />Previous Weeks</h3>
              {weeklyHistory.map((v: any) => (
                <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[#1A1A1A]">Week of {new Date(v.week_start).toLocaleDateString("default", { day: "numeric", month: "short" })}</p>
                    <div className="flex items-center gap-2">
                      {v.morale && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${MORALE_CONFIG.find(m => m.value === v.morale)?.bg || ""} ${MORALE_CONFIG.find(m => m.value === v.morale)?.color || ""}`}>
                          {MORALE_CONFIG.find(m => m.value === v.morale)?.label}
                        </span>
                      )}
                      <p className="text-sm font-bold text-emerald-600">{sym}{((v.revenue || 0) / 1000).toFixed(1)}k</p>
                    </div>
                  </div>
                  {v.top_win && <p className="text-xs text-gray-600 bg-emerald-50 rounded-lg px-3 py-2 border-l-2 border-emerald-300">🏆 {v.top_win}</p>}
                  {v.top_blocker && <p className="text-xs text-gray-600 bg-red-50 rounded-lg px-3 py-2 border-l-2 border-red-300">🚧 {v.top_blocker}</p>}
                  {v.next_week_goal && <p className="text-xs text-gray-600 bg-amber-50 rounded-lg px-3 py-2 border-l-2 border-amber-300">🎯 {v.next_week_goal}</p>}
                  {v.priorities && Array.isArray(v.priorities) && v.priorities.length > 0 && (
                    <div className="space-y-1">
                      {v.priorities.map((pr: string, i: number) => (
                        <p key={i} className="text-xs text-gray-600 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-[#635BFF]/10 text-[#635BFF] text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          {pr}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
