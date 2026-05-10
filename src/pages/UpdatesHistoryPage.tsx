import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Trophy, AlertTriangle, HelpCircle,
  Loader2, Send, Sparkles, Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────
type UpdateType = "win" | "blocker" | "ask";

type StartupUpdate = {
  id: string;
  title: string;
  content: string;
  type?: string | null;
  created_at: string | null;
};

// ─── Config per type ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<UpdateType, {
  label: string;
  icon: React.FC<{ className?: string }>;
  activeClass: string;
  badgeClass: string;
  borderClass: string;
  glowClass: string;
  placeholder: string;
}> = {
  win: {
    label: "Win 🏆",
    icon: Trophy,
    activeClass: "bg-[#00D395] text-white shadow-lg shadow-[#00D395]/25",
    badgeClass: "bg-[#00D395]/10 text-[#00D395] border-0",
    borderClass: "border-l-[#00D395]",
    glowClass: "hover:shadow-[#00D395]/10 hover:border-[#00D395]/30",
    placeholder: "e.g. Closed our first enterprise deal at £15k ARR. The team is fired up.",
  },
  blocker: {
    label: "Blocker 🚧",
    icon: AlertTriangle,
    activeClass: "bg-[#FF4D4F] text-white shadow-lg shadow-[#FF4D4F]/25",
    badgeClass: "bg-[#FF4D4F]/10 text-[#FF4D4F] border-0",
    borderClass: "border-l-[#FF4D4F]",
    glowClass: "hover:shadow-[#FF4D4F]/10 hover:border-[#FF4D4F]/30",
    placeholder: "e.g. Can't close a lead engineer despite 3 months of searching. Salary expectations are 2x our range.",
  },
  ask: {
    label: "Ask 🙋",
    icon: HelpCircle,
    activeClass: "bg-[#F5A623] text-white shadow-lg shadow-[#F5A623]/25",
    badgeClass: "bg-[#F5A623]/10 text-[#F5A623] border-0",
    borderClass: "border-l-[#F5A623]",
    glowClass: "hover:shadow-[#F5A623]/10 hover:border-[#F5A623]/30",
    placeholder: "e.g. Looking for warm intros to Seed-stage Fintech investors in Lagos or London.",
  },
};

// ─── Relative time formatter ─────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function UpdatesHistoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<UpdateType>("win");
  const [content, setContent] = useState("");

  // Fetch startup
  const { data: startup } = useQuery({
    queryKey: ["founder-startup-updates-v2", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("startup_id")
        .eq("id", user!.id)
        .single();
      if (!profile?.startup_id) return null;
      const { data } = await supabase
        .from("startups")
        .select("id, name")
        .eq("id", profile.startup_id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch updates feed
  const { data: updates = [], isLoading } = useQuery<StartupUpdate[]>({
    queryKey: ["startup-updates-feed", startup?.id],
    queryFn: async () => {
      if (!startup?.id) return [];
      const { data, error } = await supabase
        .from("startup_updates")
        .select("id, title, content, created_at")
        .eq("startup_id", startup.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!startup?.id,
  });

  // Submit new update
  const submit = useMutation({
    mutationFn: async () => {
      if (!startup?.id || !content.trim()) throw new Error("Content required");
      const cfg = TYPE_CONFIG[selectedType];
      const { error } = await supabase.from("startup_updates").insert({
        startup_id: startup.id,
        title: cfg.label.replace(/\s\S+$/, ""), // Store category as title (e.g. "Win")
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["startup-updates-feed", startup?.id] });
      toast({ title: "Update posted! ✨", description: "Your update is now visible to the Lab." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    },
  });

  const cfg = TYPE_CONFIG[selectedType];
  const Icon = cfg.icon;

  return (
    <div className="max-w-2xl mx-auto font-sans pb-24 px-4 sm:px-6 lg:px-0 space-y-8">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-[#635BFF]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Updates</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">
            Wins · Blockers · Asks — anytime
          </p>
        </div>
      </div>

      {/* ── Compose Box ── */}
      <Card className="bg-white border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-5 space-y-4">

          {/* Type selector */}
          <div className="flex gap-2">
            {(Object.keys(TYPE_CONFIG) as UpdateType[]).map((type) => {
              const c = TYPE_CONFIG[type];
              const isActive = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? c.activeClass
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <c.icon className="w-3.5 h-3.5" />
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <div className={`relative rounded-xl border-l-4 ${cfg.borderClass} bg-gray-50`}>
            <Textarea
              placeholder={cfg.placeholder}
              className="bg-transparent border-0 resize-none min-h-[100px] text-sm text-[#1A1A1A] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submit.isPending}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              onClick={() => submit.mutate()}
              disabled={submit.isPending || !content.trim()}
              className="bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-widest rounded-xl px-5 py-2.5 transition-all"
            >
              {submit.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Posting...</>
              ) : (
                <><Send className="w-3.5 h-3.5 mr-2" /> Post Update</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Feed ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
        </div>
      )}

      {!isLoading && updates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#635BFF]/10 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-[#635BFF]" />
          </div>
          <h2 className="text-base font-bold text-[#1A1A1A] mb-1">No updates yet</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Post your first Win, Blocker, or Ask above — the Lab is listening.
          </p>
        </div>
      )}

      {!isLoading && updates.length > 0 && (
        <div className="space-y-4">
          {updates.map((update) => {
            // Detect type from title since column is missing in DB
            const detectedType = (update.title?.toLowerCase() || "win") as UpdateType;
            const c = TYPE_CONFIG[detectedType] || TYPE_CONFIG.win;
            const CardIcon = c.icon;

            return (
              <div
                key={update.id}
                className={`group relative bg-white rounded-2xl border border-gray-100 border-l-4 ${c.borderClass} shadow-sm hover:shadow-md transition-all duration-200 ${c.glowClass} overflow-hidden`}
              >
                <div className="px-5 pt-4 pb-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.badgeClass}`}>
                        <CardIcon className="w-3.5 h-3.5" />
                      </div>
                      <Badge className={`text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest ${c.badgeClass}`}>
                        {detectedType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-medium">
                        {update.created_at ? timeAgo(update.created_at) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-[#1A1A1A] font-medium leading-relaxed">
                    {update.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
