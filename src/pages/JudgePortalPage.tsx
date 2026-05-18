import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Trophy, CheckCircle2, Loader2, ChevronRight, Star, ArrowLeft,
  X, Search, AlertCircle, Rocket
} from "lucide-react";

// ─── Constants & Types ─────────────────────────────────────────
const CRITERIA_DATA = [
  {
    id: "clarity",
    name: "Clarity of Problem & Solution",
    weight: "20%",
    description: "How clear and compelling the problem & solution is",
    guides: [
      "Clearly defines the specific problem the business is addressing.",
      "Demonstrates strong understanding of problem based on evidence or insight.",
      "Shows clearly how their product/service solves the problem."
    ]
  },
  {
    id: "business",
    name: "Business Model & Market Potential",
    weight: "25%",
    description: "Revenue model and scalability",
    guides: [
      "Clear revenue model.",
      "Realistic financial indicators (revenue, cost, pricing, margins).",
      "Understands market size with evidence.",
      "Logical growth path.",
      "Clear differentiation from competitors."
    ]
  },
  {
    id: "traction",
    name: "Traction & Operational Capacity",
    weight: "20%",
    description: "Execution and progress so far",
    guides: [
      "Evidence of progress (sales, users, pilots, etc.).",
      "Market validation (feedback, demand, pre-orders).",
      "Team capability to execute and scale."
    ]
  },
  {
    id: "financial",
    name: "Financial Viability",
    weight: "15%",
    description: "Sustainability and projections",
    guides: [
      "Realistic financial projections.",
      "Clear understanding of costs and margins.",
      "Strong unit economics.",
      "Path to break-even and sustainability."
    ]
  },
  {
    id: "pitch",
    name: "Pitch Delivery & Founder Readiness",
    weight: "20%",
    description: "Confidence and communication",
    guides: [
      "Clear and confident communication.",
      "Logical presentation structure.",
      "Handles questions well.",
      "Professional and investor-ready."
    ]
  }
];

interface JudgingSession {
  id: string;
  title: string;
  criteria: string[];
  status: string;
}

interface Participant {
  id: string;
  session_id: string;
  name: string;
  category?: string;
}

interface ScoreRecord {
  participant_id: string;
  scores: Record<string, number>;
}

export default function JudgePortalPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [judgeName, setJudgeName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set());
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState("All");

  // ─── Queries ────────────────────────────────────────────────
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["judge-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const { data, error } = await (supabase as any)
        .from("judging_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data as JudgingSession;
    },
    enabled: !!sessionId,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["judge-participants", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await (supabase as any)
        .from("judging_participants")
        .select("*")
        .eq("session_id", sessionId);
      if (error) throw error;
      return (data || []) as Participant[];
    },
    enabled: !!sessionId,
  });

  const { data: existingScores = [] } = useQuery({
    queryKey: ["judge-existing-scores", sessionId, judgeName],
    queryFn: async () => {
      if (!sessionId || !judgeName) return [];
      const { data, error } = await (supabase as any)
        .from("judging_scores")
        .select("participant_id, scores")
        .eq("session_id", sessionId)
        .eq("judge_name", judgeName);
      if (error) throw error;
      return (data || []) as ScoreRecord[];
    },
    enabled: !!sessionId && !!judgeName && isNameSet,
  });

  // Check if judge is finalized
  const { data: finalizedData } = useQuery({
    queryKey: ["judge-finalized", sessionId, judgeName],
    queryFn: async () => {
      if (!sessionId || !judgeName) return null;
      const { data, error } = await (supabase as any)
        .from("judging_judge_submissions")
        .select("*")
        .eq("session_id", sessionId)
        .eq("judge_name", judgeName)
        .maybeSingle();
      return data;
    },
    enabled: !!sessionId && !!judgeName && isNameSet,
  });

  const isFinalized = !!finalizedData?.is_finalized;

  // ─── Mutations ──────────────────────────────────────────────
  const submitScore = useMutation({
    mutationFn: async () => {
      if (!session || !selectedParticipant) throw new Error("Missing data");
      
      // Calculate Weighted Total
      // Clarity (20%), Business (25%), Traction (20%), Financial (15%), Pitch (20%)
      const weights: Record<string, number> = {
        "Clarity of Problem & Solution": 0.20,
        "Business Model & Market Potential": 0.25,
        "Traction & Operational Capacity": 0.20,
        "Financial Viability": 0.15,
        "Pitch Delivery & Founder Readiness": 0.20
      };

      let weightedTotal = 0;
      CRITERIA_DATA.forEach(c => {
        const score = scores[c.name] ?? 0;
        const weight = weights[c.name] ?? 0;
        weightedTotal += score * weight;
      });
      
      const { error } = await (supabase as any).from("judging_scores").upsert({
        session_id: session.id,
        participant_id: selectedParticipant.id,
        judge_name: judgeName,
        scores,
        total_score: Number(weightedTotal.toFixed(2)),
      }, { onConflict: 'session_id,participant_id,judge_name' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedParticipant(null);
      setScores({});
      qc.invalidateQueries({ queryKey: ["judge-existing-scores"] });
      toast({ title: "Scores Saved!", description: "Progress updated." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const finalizeSession = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("judging_judge_submissions")
        .upsert({
          session_id: sessionId,
          judge_name: judgeName,
          is_finalized: true
        }, { onConflict: 'session_id,judge_name' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judge-finalized"] });
      toast({ title: "Session Submitted!", description: "Thank you for your judging." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ─── Logic ──────────────────────────────────────────────────
  const scoredMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    existingScores.forEach(s => {
      map[s.participant_id] = s.scores;
    });
    return map;
  }, [existingScores]);

  const filteredParticipants = participants.filter(p => {
    const nameMatches = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const category = p.category && p.category.trim() ? p.category.trim() : "General";
    
    if (activeCategoryTab === "All") return nameMatches;
    return nameMatches && category.toLowerCase() === activeCategoryTab.toLowerCase();
  });

  const totalParticipants = participants.length;
  const scoredCount = existingScores.length;
  const progressPct = totalParticipants > 0 ? Math.round((scoredCount / totalParticipants) * 100) : 0;

  const toggleGuide = (name: string) => {
    setExpandedGuides(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // ─── Rendering ──────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F6F2]">
        <Loader2 className="h-8 w-8 animate-spin text-[#635BFF]" />
      </div>
    );
  }

  if (!isNameSet) {
    return (
      <div className="min-h-screen bg-[#F9F6F2] flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8 text-center bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100/50">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center shadow-xl shadow-[#1A1A1A]/10">
              <Rocket className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="space-y-3 mb-8">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-tight">Welcome to Founder Pulse Judging Hub</h1>
            <p className="text-sm font-semibold text-gray-400 leading-relaxed">Please enter your name to judge the awaiting participants</p>
          </div>
          <div className="space-y-4">
            <Input
              placeholder="Enter your full name"
              value={judgeName}
              onChange={(e) => setJudgeName(e.target.value)}
              className="h-14 rounded-2xl bg-gray-50 border-gray-100 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10 font-bold text-center text-lg placeholder:text-gray-300"
            />
            <Button
              className="w-full h-14 rounded-2xl bg-[#635BFF] hover:bg-[#5249cf] text-white font-black text-lg shadow-xl shadow-[#635BFF]/15 transition-all active:scale-95"
              disabled={!judgeName.trim()}
              onClick={() => setIsNameSet(true)}
            >
              Start Judging
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Scoring Modal Overlay
  if (selectedParticipant) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F9F6F2] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white shadow-sm z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-gray-900">{selectedParticipant.name}</h2>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${
                selectedParticipant.category === "Ideation"
                  ? "bg-indigo-50 text-indigo-600"
                  : selectedParticipant.category === "Prototype"
                  ? "bg-violet-50 text-violet-600"
                  : selectedParticipant.category === "SME"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-50 text-slate-500"
              }`}>
                {selectedParticipant.category || "General"}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Evaluation Portal</p>
          </div>
          <button 
            onClick={() => { setSelectedParticipant(null); setScores({}); setExpandedGuides(new Set()); }}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Content - SCROLLABLE */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-48">
          {CRITERIA_DATA.map((criterion) => {
            const currentScore = scores[criterion.name] ?? scoredMap[selectedParticipant.id]?.[criterion.name];
            const isExpanded = expandedGuides.has(criterion.name);

            return (
              <div key={criterion.name} className="bg-white p-6 rounded-3xl border border-gray-100/50 shadow-sm space-y-6">
                {/* Criterion Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-black text-gray-900 leading-tight">{criterion.name}</h3>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button 
                        onClick={() => toggleGuide(criterion.name)}
                        className="text-[10px] font-bold text-[#635BFF] bg-[#635BFF]/10 px-3 py-1 rounded-full uppercase tracking-wider hover:bg-[#635BFF]/15 transition-all"
                      >
                        {isExpanded ? "Hide Guide" : "View Guide"}
                      </button>
                      <span className="text-[10px] font-bold text-[#635BFF] bg-[#635BFF]/10 px-3 py-1 rounded-full uppercase tracking-wider">
                        Weight: {criterion.weight}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2.5 font-medium leading-relaxed">{criterion.description}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black text-xl transition-all shrink-0 ${
                    currentScore !== undefined ? "border-[#635BFF] text-[#635BFF] bg-[#635BFF]/5 shadow-sm shadow-[#635BFF]/5" : "border-gray-50 text-gray-200"
                  }`}>
                    {currentScore ?? "—"}
                  </div>
                </div>

                {/* Guide Text */}
                {isExpanded && (
                  <div className="bg-[#635BFF]/5 rounded-2xl p-5 border border-[#635BFF]/10 animate-in fade-in slide-in-from-top-2">
                    <ul className="space-y-3">
                      {criterion.guides.map((g, i) => (
                        <li key={i} className="text-[11px] text-gray-600 font-bold flex items-start gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#635BFF] mt-1 shrink-0" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Score Selector */}
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      onClick={() => setScores(prev => ({ ...prev, [criterion.name]: num }))}
                      className={`h-12 rounded-xl font-black text-sm transition-all active:scale-90 ${
                        currentScore === num 
                          ? "bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/20" 
                          : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 flex flex-col gap-3 shadow-[0_-8px_30px_rgb(0,0,0,0.02)]">
          <Button 
            className="w-full h-14 rounded-2xl bg-[#635BFF] hover:bg-[#5249cf] text-white font-black text-lg shadow-xl shadow-[#635BFF]/15 transition-all active:scale-95"
            onClick={() => submitScore.mutate()}
            disabled={submitScore.isPending || isFinalized}
          >
            {submitScore.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "Save Scores"}
          </Button>
          <button 
            onClick={() => { setSelectedParticipant(null); setScores({}); }}
            className="w-full h-10 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // ─── Main List View ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F9F6F2]">
      {/* Premium Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black text-[#635BFF]">founder</span>
              <span className="text-xl font-black text-gray-900">pulse</span>
            </div>
            <div className="hidden sm:block h-8 w-[1px] bg-gray-100" />
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none">Judging as</p>
              <p className="text-sm font-bold text-gray-700 mt-1">{judgeName}</p>
            </div>
          </div>
          <Button 
            disabled={progressPct < 100 || isFinalized || finalizeSession.isPending}
            onClick={() => setIsFinalizeOpen(true)}
            className={`rounded-xl px-6 h-12 font-black text-sm transition-all active:scale-95 ${
              isFinalized 
                ? "bg-gray-100 text-gray-400 cursor-default" 
                : "bg-[#635BFF] hover:bg-[#5249cf] text-white shadow-lg shadow-[#635BFF]/15"
            }`}
          >
            {isFinalized ? (
              <>Submitted <CheckCircle2 className="h-4 w-4 ml-2" /></>
            ) : (
              <>Submit All ({totalParticipants})</>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
        {/* Progress Section */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100/50 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Scoring Progress</h2>
            <span className="text-sm font-black text-[#635BFF]">{progressPct}%</span>
          </div>
          <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
            <div 
              className="h-full bg-gradient-to-r from-[#635BFF] to-[#8F00FF] transition-all duration-700 ease-out" 
              style={{ width: `${progressPct}%` }} 
            />
          </div>
          <p className="text-[10px] font-bold text-gray-400">{scoredCount} of {totalParticipants} participants scored</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input 
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-14 rounded-2xl bg-white border border-gray-100/50 shadow-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10"
          />
        </div>

        {/* Category Track Filter Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-50 rounded-2xl w-fit border border-gray-100">
          {[
            { value: "All", label: "🌍 All Tracks" },
            { value: "Ideation", label: "💡 Ideation" },
            { value: "Prototype", label: "🛠️ Prototype" },
            { value: "SME", label: "💼 SME" }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveCategoryTab(tab.value)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeCategoryTab === tab.value
                  ? "bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/10 active:scale-95"
                  : "text-gray-500 hover:text-gray-900 active:scale-95"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Participant List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredParticipants.map(p => {
            const pScores = scoredMap[p.id];
            const isScored = !!pScores;

            return (
              <Card 
                key={p.id}
                onClick={() => {
                  if (!isFinalized) {
                    setSelectedParticipant(p);
                    setScores(pScores || {});
                  }
                }}
                className={`group border-none shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgb(99,91,255,0.06)] hover:border-[#635BFF]/10 hover:scale-[1.01] transition-all duration-300 rounded-3xl cursor-pointer overflow-hidden ${
                  isScored ? "bg-white border border-gray-100/30" : "bg-white/50 border-dashed border-2 border-gray-200"
                }`}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-gray-900 group-hover:text-[#635BFF] transition-colors truncate pr-2">{p.name}</h3>
                      <span className={`text-[9px] px-2 py-0.5 mt-1 inline-block rounded-full font-black uppercase tracking-wider shrink-0 ${
                        p.category === "Ideation"
                          ? "bg-indigo-50 text-indigo-600"
                          : p.category === "Prototype"
                          ? "bg-violet-50 text-violet-600"
                          : p.category === "SME"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-50 text-slate-500"
                      }`}>
                        {p.category || "General"}
                      </span>
                    </div>
                    {isScored ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00D395] shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-100 shrink-0" />
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {CRITERIA_DATA.map(c => {
                      const score = pScores?.[c.name] ?? 0;
                      return (
                        <div key={c.name} className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                            <span className="truncate pr-4">{c.name}</span>
                            <span className={score > 0 ? "text-gray-900" : "text-gray-200"}>{score || "—"}</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${score > 5 ? 'bg-[#00D395]' : 'bg-[#635BFF]'}`}
                              style={{ width: `${(score / 7) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] font-bold text-center text-gray-300 uppercase tracking-widest pt-2 group-hover:text-[#635BFF]/50 transition-colors">
                    {isScored ? "Click to edit" : "Ready to score"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── Finalize Confirmation Dialog ─── */}
      <Dialog open={isFinalizeOpen} onOpenChange={setIsFinalizeOpen}>
        <DialogContent className="sm:max-w-md border-none rounded-3xl shadow-2xl p-8 bg-white">
          <DialogHeader className="text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-[#635BFF]/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-[#635BFF]" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900">Finalize Session?</DialogTitle>
            <DialogDescription className="text-sm font-bold text-gray-400 leading-relaxed">
              Once submitted, you will not be able to change any scores. Are you sure you've completed all evaluations?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button 
              variant="ghost" 
              className="flex-1 h-14 rounded-2xl font-bold text-gray-400" 
              onClick={() => setIsFinalizeOpen(false)}
            >
              Go Back
            </Button>
            <Button 
              className="flex-1 h-14 rounded-2xl bg-[#635BFF] hover:bg-[#5249cf] text-white font-black text-lg shadow-xl shadow-[#635BFF]/15 transition-all active:scale-95"
              onClick={() => {
                setIsFinalizeOpen(false);
                finalizeSession.mutate();
              }}
              disabled={finalizeSession.isPending}
            >
              {finalizeSession.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
