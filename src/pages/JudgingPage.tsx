import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Trophy, Plus, Copy, Link2, Users, BarChart3,
  Loader2, ChevronRight, Trash2, Crown, Medal, Award,
  FileDown, Phone, Info, Eye, X
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ─────────────────────────────────────────────────────
interface JudgingSession {
  id: string;
  title: string;
  criteria: string[];
  status: string;
  created_at: string;
}

interface Participant {
  id: string;
  session_id: string;
  name: string;
  category?: string;
}

interface ScoreEntry {
  id: string;
  session_id: string;
  participant_id: string;
  judge_name: string;
  scores: Record<string, number>;
  total_score: number;
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────
const DEFAULT_CRITERIA = [
  "Clarity of Problem & Solution",
  "Business Model & Market Potential",
  "Traction & Operational Capacity",
  "Financial Viability",
  "Pitch Delivery & Founder Readiness"
];

export default function JudgingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedSession, setSelectedSession] = useState<JudgingSession | null>(null);
  const [selectedDetailsParticipantId, setSelectedDetailsParticipantId] = useState<string | null>(null);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [removeParticipantData, setRemoveParticipantData] = useState<{ id: string; name: string } | null>(null);
  const [newCategory, setNewCategory] = useState("Ideation");
  const [customCategory, setCustomCategory] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState("All");

  // ─── Queries ────────────────────────────────────────────────
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["judging-sessions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("judging_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as JudgingSession[];
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["judging-participants", selectedSession?.id],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await (supabase as any)
        .from("judging_participants")
        .select("*")
        .eq("session_id", selectedSession.id);
      if (error) throw error;
      return (data || []) as Participant[];
    },
    enabled: !!selectedSession,
  });

  const { data: allScores = [] } = useQuery({
    queryKey: ["judging-scores", selectedSession?.id],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await (supabase as any)
        .from("judging_scores")
        .select("*")
        .eq("session_id", selectedSession.id);
      if (error) throw error;
      return (data || []) as ScoreEntry[];
    },
    enabled: !!selectedSession,
  });

  // ─── Mutations ──────────────────────────────────────────────
  const createSession = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await (supabase as any)
        .from("judging_sessions")
        .insert({ title, criteria: DEFAULT_CRITERIA })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["judging-sessions"] });
      setIsCreateOpen(false);
      setNewTitle("");
      setSelectedSession(data as JudgingSession);
      toast({ title: "Session Created", description: "Now add participants and share the judge link." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addParticipant = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: string }) => {
      if (!selectedSession) throw new Error("No session");
      const { error } = await (supabase as any)
        .from("judging_participants")
        .insert({ session_id: selectedSession.id, name: name, category: category });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judging-participants", selectedSession?.id] });
      setNewParticipantName("");
      setNewCategory("Ideation");
      setCustomCategory("");
      setIsAddParticipantOpen(false);
      toast({ title: "Participant Added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeParticipant = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await (supabase as any).from("judging_participants").delete().eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judging-participants", selectedSession?.id] });
      toast({ title: "Participant Removed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await (supabase as any).from("judging_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judging-sessions"] });
      setSelectedSession(null);
      toast({ title: "Session Deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ─── Computed: Leaderboard ─────────────────────────────────
  const fullLeaderboard = participants
    .map((p) => {
      const pScores = allScores.filter((s) => s.participant_id === p.id);
      const judgeCount = pScores.length;
      const avgScore = judgeCount > 0 ? pScores.reduce((sum, s) => sum + s.total_score, 0) / judgeCount : 0;
      const category = p.category && p.category.trim() ? p.category.trim() : "General";

      // Per-criteria averages
      const criteriaAvgs: Record<string, number> = {};
      if (judgeCount > 0 && selectedSession) {
        for (const c of selectedSession.criteria) {
          const vals = pScores.map((s) => s.scores[c] ?? 0);
          criteriaAvgs[c] = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      }

      return {
        id: p.id,
        name: p.name || "Unknown",
        category,
        avgScore: Number(avgScore.toFixed(1)),
        judgeCount,
        criteriaAvgs,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  // Filtered leaderboard for presentation based on activeCategoryTab
  const leaderboard = fullLeaderboard.filter((entry) => {
    if (activeCategoryTab === "All") return true;
    return entry.category.toLowerCase() === activeCategoryTab.toLowerCase();
  });

  const uniqueJudges = [...new Set(allScores.map((s) => s.judge_name))];

  const copyJudgeLink = () => {
    if (!selectedSession) return;
    const link = `${window.location.origin}/judge/${selectedSession.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copied!", description: "Share this with your judges." });
  };

  const handleExportPDF = () => {
    if (!selectedSession) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    const rows = leaderboard.map((entry, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td>
          <div style="font-weight: bold;">${entry.name}</div>
          <div style="font-size: 11px; color: #666;">Category: ${entry.category}</div>
        </td>
        ${selectedSession.criteria.map(c => `<td>${entry.criteriaAvgs[c]?.toFixed(1) || '-'}</td>`).join('')}
        <td style="font-weight: bold; color: #635BFF;">${entry.avgScore}</td>
        <td>${entry.judgeCount}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedSession.title} - Judging Report</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; }
            h1 { margin: 0; color: #111; }
            .date { color: #666; font-size: 14px; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f9fafb; text-align: left; padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
            .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${selectedSession.title}</h1>
            <div class="date">Generated on ${date}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Participant</th>
                ${selectedSession.criteria.map(c => `<th>${c}</th>`).join('')}
                <th>Overall Score</th>
                <th>Judges</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">
            Generated by Founder Compass Judging Hub
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-bold text-gray-400">#{index + 1}</span>;
  };

  // ─── Render ─────────────────────────────────────────────────
  if (sessionsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#F5A623]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#F5A623]/10 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-[#F5A623]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Judging Hub</h1>
            <p className="text-sm text-gray-500 font-medium">Create sessions, invite judges, rank participants.</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl bg-gray-900 hover:bg-gray-800 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Session
        </Button>
      </div>

      {/* ─── SESSION LIST (if no session selected) ─── */}
      {!selectedSession && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <Card className="border border-dashed border-gray-200 rounded-3xl bg-white">
              <CardContent className="p-12 text-center">
                <Trophy className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-400">No Judging Sessions Yet</h3>
                <p className="text-sm text-gray-400 mt-1">Click "New Session" to set up your first Demo Day.</p>
              </CardContent>
            </Card>
          ) : (
            sessions.map((s) => (
              <Card
                key={s.id}
                className="border border-gray-100 rounded-3xl bg-white hover:border-[#F5A623]/30 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelectedSession(s)}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-[#F5A623]/10 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-[#F5A623]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-[#F5A623] transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">
                        {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}{s.criteria.length} criteria
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`border-none text-[9px] font-bold uppercase tracking-widest ${s.status === "active" ? "text-[#00D395] bg-[#00D395]/10" : "text-gray-400 bg-gray-50"}`}>
                      {s.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#F5A623] transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ─── SESSION DETAIL VIEW ─── */}
      {selectedSession && (
        <div className="space-y-6">
          {/* Back + Title */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedSession(null)} className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
                ← All Sessions
              </button>
              <h2 className="text-xl font-bold tracking-tight">{selectedSession.title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl border-gray-200" onClick={copyJudgeLink}>
                <Copy className="h-4 w-4 mr-2" /> Copy Judge Link
              </Button>
              <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setIsAddParticipantOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Participant
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => setDeleteSessionId(selectedSession.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Participants</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{participants.length}</p>
                </div>
                <div className="p-3 bg-[#635BFF]/10 rounded-2xl">
                  <Users className="h-5 w-5 text-[#635BFF]" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Judges Scored</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{uniqueJudges.length}</p>
                </div>
                <div className="p-3 bg-[#00D395]/10 rounded-2xl">
                  <BarChart3 className="h-5 w-5 text-[#00D395]" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl cursor-pointer hover:bg-gray-50 transition-all group" onClick={copyJudgeLink}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Share Link</p>
                  <p className="text-xs font-bold text-[#635BFF] mt-2 group-hover:underline">Click to copy</p>
                  {window.location.hostname === 'localhost' && (
                    <div className="flex items-center gap-1 mt-2 text-[8px] text-gray-400">
                      <Phone className="h-2 w-2" />
                      <span>Use Local IP to test on mobile</span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-[#635BFF]/10 rounded-2xl group-hover:bg-[#635BFF]/20 transition-colors">
                  <Link2 className="h-5 w-5 text-[#635BFF]" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── LIVE LEADERBOARD ─── */}
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Live Leaderboard</h3>
                {leaderboard.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#635BFF] hover:text-[#635BFF] hover:bg-[#635BFF]/5"
                    onClick={handleExportPDF}
                  >
                    <FileDown className="h-3 w-3 mr-2" /> Download Report
                  </Button>
                )}
              </div>

              {/* Category Track Filter Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-50 rounded-2xl w-fit">
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

              {leaderboard.length === 0 ? (
                <div className="py-12 text-center text-gray-300">
                  <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Add participants and share the judge link to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#635BFF]/30 hover:shadow-lg hover:shadow-[#635BFF]/5 transition-all cursor-pointer"
                      onClick={() => setSelectedDetailsParticipantId(entry.id)}
                    >
                      <div className="h-10 w-10 flex items-center justify-center shrink-0">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{entry.name}</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${
                            entry.category === "Ideation"
                              ? "bg-indigo-50 text-indigo-600"
                              : entry.category === "Prototype"
                              ? "bg-violet-50 text-violet-600"
                              : entry.category === "SME"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-50 text-slate-500"
                          }`}>
                            {entry.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                          {entry.judgeCount} {entry.judgeCount === 1 ? "judge" : "judges"} scored
                        </p>
                      </div>

                      {/* Per-criteria mini bars */}
                      <div className="hidden md:flex items-center gap-3">
                        {selectedSession.criteria.map((c) => (
                          <div key={c} className="text-center">
                            <div className="w-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#635BFF] rounded-full"
                                style={{ width: `${((entry.criteriaAvgs[c] || 0) / 7) * 100}%` }}
                              />
                            </div>
                            <p className="text-[8px] text-gray-400 mt-1 font-bold truncate max-w-[40px]">
                              {c.split(" ")[0]}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xl font-black ${index === 0 ? "text-[#635BFF]" : "text-gray-900"}`}>
                          {entry.avgScore > 0 ? entry.avgScore : "—"}
                        </span>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Overall</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemoveParticipantData({ id: entry.id, name: entry.name });
                        }}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Judge Breakdown */}
          {uniqueJudges.length > 0 && (
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Judge Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {uniqueJudges.map((judge) => {
                    const judgeScores = allScores.filter((s) => s.judge_name === judge);
                    return (
                      <div key={judge} className="p-4 bg-gray-50 rounded-2xl">
                        <p className="text-sm font-bold text-gray-900">{judge}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">
                          Scored {judgeScores.length} {judgeScores.length === 1 ? "participant" : "participants"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── CREATE SESSION DIALOG ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Judging Session</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Set up a new Demo Day or competition event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-600 font-semibold">Session Title</Label>
              <Input
                placeholder="e.g. Demo Day 2026 Q2"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-14 rounded-2xl bg-gray-50 border-none font-medium px-6"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600 font-semibold">Scoring Criteria</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_CRITERIA.map((c) => (
                  <Badge key={c} variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-gray-50 border-gray-200 text-gray-500 px-3 py-1">
                    {c}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                These criteria will be shown to each judge. Each is scored 1–10.
              </p>
            </div>
          </div>
          <Button
            className="w-full h-14 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800"
            onClick={() => createSession.mutate(newTitle)}
            disabled={!newTitle.trim() || createSession.isPending}
          >
            {createSession.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Session"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ─── ADD PARTICIPANT DIALOG ─── */}
      <Dialog open={isAddParticipantOpen} onOpenChange={setIsAddParticipantOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Register Participant</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Enter the name of the individual or startup.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Startup Name</Label>
              <Input
                placeholder="Participant or Startup Name"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                className="h-14 rounded-2xl bg-gray-50 border-none font-medium px-6 focus-visible:ring-[#635BFF]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Category Track</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "Ideation", label: "💡 Ideation" },
                  { value: "Prototype", label: "🛠️ Prototype" },
                  { value: "SME", label: "💼 SME" },
                  { value: "Other", label: "⚙️ Custom..." }
                ].map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setNewCategory(cat.value)}
                    className={`h-11 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      newCategory === cat.value
                        ? "bg-[#635BFF] text-white border-[#635BFF] shadow-lg shadow-[#635BFF]/10 active:scale-95"
                        : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50 active:scale-95"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {newCategory === "Other" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custom Category Name</Label>
                <Input
                  placeholder="Enter custom category (e.g. FinTech)"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="h-12 rounded-2xl bg-gray-50 border-none font-medium px-6 focus-visible:ring-[#635BFF]"
                />
              </div>
            )}
          </div>
          <Button
            className="w-full h-14 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800"
            onClick={() => {
              const finalCategory = newCategory === "Other" ? (customCategory.trim() || "General") : newCategory;
              addParticipant.mutate({ name: newParticipantName, category: finalCategory });
            }}
            disabled={!newParticipantName.trim() || addParticipant.isPending || (newCategory === "Other" && !customCategory.trim())}
          >
            {addParticipant.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Add to Session"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ─── Detailed Breakdown Dialog ─── */}
      <Dialog 
        open={!!selectedDetailsParticipantId} 
        onOpenChange={() => setSelectedDetailsParticipantId(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none rounded-3xl shadow-2xl bg-white">
          <DialogHeader className="p-8 border-b border-gray-50 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black text-gray-900">
                  {participants.find(p => p.id === selectedDetailsParticipantId)?.name}
                </DialogTitle>
                <DialogDescription className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">
                  Per-Judge Score Breakdown
                </DialogDescription>
              </div>
              <button 
                onClick={() => setSelectedDetailsParticipantId(null)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-gray-50">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Judge Name</TableHead>
                  {selectedSession?.criteria.map(c => (
                    <TableHead key={c} className="font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">
                      {c.split(' ').slice(0, 2).join(' ')}...
                    </TableHead>
                  ))}
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-900 text-right">Overall Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allScores
                  .filter(s => s.participant_id === selectedDetailsParticipantId)
                  .map((score, i) => (
                    <TableRow key={i} className="hover:bg-gray-50/50 border-gray-50">
                      <TableCell className="font-bold text-gray-900">{score.judge_name}</TableCell>
                      {selectedSession?.criteria.map((c, idx) => {
                        // Smarter lookup: try direct match, then fuzzy match, then fallback to index
                        let val = score.scores[c];
                        if (val === undefined) {
                          const keys = Object.keys(score.scores);
                          // Try index-based match if names are totally different but count is same
                          if (keys.length === selectedSession.criteria.length) {
                            val = score.scores[keys[idx]];
                          }
                        }
                        return (
                          <TableCell key={c} className="text-center font-medium text-gray-600">
                            {val ?? "—"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-black text-[#F5A623]">{score.total_score}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="p-6 border-t border-gray-50 shrink-0">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl font-bold border-gray-100" 
              onClick={() => setSelectedDetailsParticipantId(null)}
            >
              Close Breakdown
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE SESSION CONFIRMATION DIALOG ─── */}
      <Dialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <DialogContent className="sm:max-w-md border-none rounded-3xl shadow-2xl p-8 bg-white">
          <DialogHeader className="text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900">Delete Judging Session?</DialogTitle>
            <DialogDescription className="text-sm font-semibold text-gray-400 leading-relaxed">
              Are you sure you want to delete this session and all of its judge scores? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button 
              variant="ghost" 
              className="flex-1 h-14 rounded-2xl font-bold text-gray-400" 
              onClick={() => setDeleteSessionId(null)}
            >
              Go Back
            </Button>
            <Button 
              className="flex-1 h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-lg shadow-xl shadow-rose-500/15 transition-all active:scale-95"
              onClick={() => {
                if (deleteSessionId) {
                  deleteSession.mutate(deleteSessionId);
                  setDeleteSessionId(null);
                }
              }}
              disabled={deleteSession.isPending}
            >
              {deleteSession.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "Delete Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── REMOVE PARTICIPANT CONFIRMATION DIALOG ─── */}
      <Dialog open={!!removeParticipantData} onOpenChange={() => setRemoveParticipantData(null)}>
        <DialogContent className="sm:max-w-md border-none rounded-3xl shadow-2xl p-8 bg-white">
          <DialogHeader className="text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
              <Trash2 className="h-8 w-8 text-amber-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900">Remove Participant?</DialogTitle>
            <DialogDescription className="text-sm font-semibold text-gray-400 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-gray-900">{removeParticipantData?.name}</span> from this session? Their historical scores and ranking will be deleted permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button 
              variant="ghost" 
              className="flex-1 h-14 rounded-2xl font-bold text-gray-400" 
              onClick={() => setRemoveParticipantData(null)}
            >
              Go Back
            </Button>
            <Button 
              className="flex-1 h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-lg shadow-xl shadow-rose-500/15 transition-all active:scale-95"
              onClick={() => {
                if (removeParticipantData) {
                  removeParticipant.mutate(removeParticipantData.id);
                  setRemoveParticipantData(null);
                }
              }}
              disabled={removeParticipant.isPending}
            >
              {removeParticipant.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
