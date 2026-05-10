import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { GraduationCap, Search, Download, Plus, ChevronRight, CheckCircle2, Loader2, BarChart3, FileText } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer
} from "recharts";

type Scores = {
  clarity: number | null;
  businessModel: number | null;
  traction: number | null;
  financials: number | null;
  pitch: number | null;
};

type Participant = {
  id: string;
  name: string;
  status: string;
  scores: Scores;
};

const WEIGHTS = {
  clarity: 0.20,
  businessModel: 0.25,
  traction: 0.20,
  financials: 0.15,
  pitch: 0.20,
};

const GUIDES = {
  clarity: [
    "Clearly defines the specific problem the business is addressing.",
    "Demonstrates strong understanding of problem based on evidence or insight.",
    "Shows clearly how their product/service solves the problem."
  ],
  businessModel: [
    "Clear revenue model.",
    "Realistic financial indicators (revenue, cost, pricing, margins).",
    "Understands market size with evidence.",
    "Logical growth path.",
    "Clear differentiation from competitors."
  ],
  traction: [
    "Evidence of progress (sales, users, pilots, etc.).",
    "Market validation (feedback, demand, pre-orders).",
    "Team capability to execute and scale."
  ],
  financials: [
    "Realistic financial projections.",
    "Clear understanding of costs and margins.",
    "Strong unit economics.",
    "Path to break-even and sustainability."
  ],
  pitch: [
    "Clear and confident communication.",
    "Logical presentation structure.",
    "Handles questions well.",
    "Professional and investor-ready."
  ]
};

const CATEGORY_LABELS = {
  clarity: "Clarity of Problem & Solution",
  businessModel: "Business Model & Market Potential",
  traction: "Traction & Operational Capacity",
  financials: "Financial Viability",
  pitch: "Pitch Delivery & Founder Readiness",
};

export default function GradingSystemPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [tempScores, setTempScores] = useState<Scores | null>(null);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Fetch Participants
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        status: row.status || 'pending',
        scores: {
          clarity: row.clarity,
          businessModel: row.business_model,
          traction: row.traction,
          financials: row.financials,
          pitch: row.pitch,
        }
      })) as Participant[];
    }
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("evaluations")
        .insert([{ name, author_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast({ title: "Participant Added", description: "Successfully registered for evaluation." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, scores }: { id: string, scores: Scores }) => {
      const isComplete = Object.values(scores).every(s => s !== null);
      const { error } = await supabase
        .from("evaluations")
        .update({
          clarity: scores.clarity,
          business_model: scores.businessModel,
          traction: scores.traction,
          financials: scores.financials,
          pitch: scores.pitch,
          status: isComplete ? 'ready' : 'pending'
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast({ title: "Scores Saved", description: "Participant evaluation updated." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const submitAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("evaluations")
        .update({ status: 'submitted' })
        .eq("status", "ready");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast({ title: "All Scores Submitted", description: "Batch evaluation finalized." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const filteredParticipants = participants.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const scoredCount = participants.filter(p => p.status === 'ready' || p.status === 'submitted').length;
  const readyToSubmitCount = participants.filter(p => p.status === 'ready').length;
  const progressPct = participants.length === 0 ? 0 : Math.round((scoredCount / participants.length) * 100);

  const calculateFinalScore = (scores: Scores) => {
    if (Object.values(scores).some(s => s === null)) return null;
    const final = (
      (scores.clarity! * WEIGHTS.clarity) +
      (scores.businessModel! * WEIGHTS.businessModel) +
      (scores.traction! * WEIGHTS.traction) +
      (scores.financials! * WEIGHTS.financials) +
      (scores.pitch! * WEIGHTS.pitch)
    );
    return Number(final.toFixed(1));
  };

  const getGrade = (score: number | null) => {
    if (score === null) return { grade: "-", color: "text-gray-400" };
    if (score >= 9) return { grade: "A+", color: "text-[#00D395]" };
    if (score >= 8) return { grade: "A", color: "text-[#00D395]" };
    if (score >= 7) return { grade: "B", color: "text-[#635BFF]" };
    if (score >= 5) return { grade: "C", color: "text-[#F5A623]" };
    return { grade: "D", color: "text-[#FF4D4F]" };
  };

  const handleExportCSV = () => {
    const headers = ["Participant Name", "Clarity (20%)", "Business Model (25%)", "Traction (20%)", "Financials (15%)", "Pitch (20%)", "Final Score", "Grade"];
    const rows = participants.map(p => {
      const finalScore = calculateFinalScore(p.scores);
      const grade = getGrade(finalScore).grade;
      return [
        `"${p.name}"`,
        `"${p.scores.clarity ?? "N/A"}"`,
        `"${p.scores.businessModel ?? "N/A"}"`,
        `"${p.scores.traction ?? "N/A"}"`,
        `"${p.scores.financials ?? "N/A"}"`,
        `"${p.scores.pitch ?? "N/A"}"`,
        `"${finalScore ?? "N/A"}"`,
        `"${grade}"`
      ].join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `evaluation_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    const rows = participants.map(p => {
      const finalScore = calculateFinalScore(p.scores);
      const { grade } = getGrade(finalScore);
      return `
        <tr>
          <td>${p.name}</td>
          <td>${p.scores.clarity ?? '-'}</td>
          <td>${p.scores.businessModel ?? '-'}</td>
          <td>${p.scores.traction ?? '-'}</td>
          <td>${p.scores.financials ?? '-'}</td>
          <td>${p.scores.pitch ?? '-'}</td>
          <td style="font-weight: bold;">${finalScore ?? '-'}</td>
          <td style="font-weight: bold; color: #F5A623;">${grade}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Evaluation Report - ${date}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
            .header { border-bottom: 2px solid #F5A623; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1a1a1a; font-size: 24px; }
            .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f9fafb; padding: 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; border-bottom: 1px solid #e5e7eb; }
            td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
            .summary { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-card { background: #f9fafb; padding: 20px; rounded: 12px; border: 1px solid #e5e7eb; }
            .stat-card span { font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold; }
            .stat-card p { font-size: 20px; font-weight: bold; margin: 5px 0 0; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Collective Lab Evaluation Report</h1>
            <p>Generated on ${date} • Portfolio Intelligence Hub</p>
          </div>
          <div class="summary">
            <div class="stat-card">
              <span>Total Participants</span>
              <p>${participants.length}</p>
            </div>
            <div class="stat-card">
              <span>Average Score</span>
              <p>${(participants.reduce((acc, p) => acc + (calculateFinalScore(p.scores) || 0), 0) / (participants.length || 1)).toFixed(1)}</p>
            </div>
            <div class="stat-card">
              <span>Batch Status</span>
              <p>Finalized</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Startup Name</th>
                <th>Clarity (20%)</th>
                <th>Model (25%)</th>
                <th>Traction (20%)</th>
                <th>Finance (15%)</th>
                <th>Pitch (20%)</th>
                <th>Final</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-[#F5A623]" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#F5A623]/10 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-[#F5A623]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">Evaluation Hub</h1>
            <p className="text-sm text-muted-foreground font-medium">Real-time interview scoring & analytics.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Participant
          </Button>
          <Button variant="ghost" size="icon" onClick={handleExportPDF} className="rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors">
            <Download className="h-5 w-5" />
          </Button>
          <Button 
            className="rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50" 
            onClick={() => submitAllMutation.mutate()}
            disabled={readyToSubmitCount === 0 || submitAllMutation.isPending}
          >
            {submitAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Submit All ({readyToSubmitCount})
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scoring Progress</span>
              <span className="text-lg font-black text-[#F5A623]">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2 bg-gray-100" />
            <p className="text-[10px] text-gray-400 mt-4 font-bold uppercase">{scoredCount} of {participants.length} Scored</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl flex items-center justify-between p-6">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Awaiting Submission</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{readyToSubmitCount}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl"><BarChart3 className="h-5 w-5 text-blue-500" /></div>
        </Card>
        <Card 
          className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-all group"
          onClick={handleExportPDF}
        >
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reporting Hub</span>
            <p className="text-xs font-bold text-gray-900 mt-2">Generate PDF Report</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-[#F5A623]/10 transition-colors">
            <FileText className="h-5 w-5 text-gray-400 group-hover:text-[#F5A623]" />
          </div>
        </Card>
      </div>

      {/* Participant List */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
        <Input 
          placeholder="Search participants..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-14 rounded-3xl bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-sm font-medium focus-visible:ring-1 focus-visible:ring-[#F5A623]"
        />
      </div>

      <div className="space-y-4">
        {filteredParticipants.map(p => {
          const finalScore = calculateFinalScore(p.scores);
          const gradeInfo = getGrade(finalScore);
          const isComplete = p.status === 'ready' || p.status === 'submitted';

          return (
            <Card key={p.id} className="border border-gray-100 shadow-sm rounded-3xl hover:border-[#F5A623]/30 hover:shadow-md transition-all cursor-pointer bg-white group" onClick={() => {
              setSelectedParticipant(p);
              setTempScores({ ...p.scores });
            }}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#F5A623] transition-colors">{p.name}</h3>
                        <Badge variant="outline" className={`mt-2 text-[9px] font-bold uppercase tracking-widest border-none px-0 ${p.status === 'submitted' ? 'text-blue-500' : p.status === 'ready' ? 'text-[#00D395]' : 'text-gray-400'}`}>
                          {p.status === 'submitted' ? 'Finalized' : p.status === 'ready' ? 'Ready to submit' : 'Drafting scores'}
                        </Badge>
                      </div>
                      {isComplete && (
                        <div className="text-right">
                          <span className={`text-3xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Weighted Score: {finalScore}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {(Object.keys(CATEGORY_LABELS) as Array<keyof Scores>).map(key => (
                        <div key={key} className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-gray-400 uppercase tracking-tighter truncate mr-4">{CATEGORY_LABELS[key].split(' ')[0]}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-16 bg-gray-50 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full ${p.scores[key] !== null ? 'bg-[#F5A623]' : 'bg-gray-100'}`} style={{ width: `${(p.scores[key] || 0) * 10}%` }} />
                            </div>
                            <span className="w-4 text-right text-gray-900">{p.scores[key] !== null ? p.scores[key] : "-"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-[220px] h-[180px] bg-gray-50/50 rounded-3xl flex items-center justify-center shrink-0 p-4">
                    {isComplete ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={[
                          { subject: 'Problem', A: p.scores.clarity, fullMark: 10 },
                          { subject: 'Model', A: p.scores.businessModel, fullMark: 10 },
                          { subject: 'Traction', A: p.scores.traction, fullMark: 10 },
                          { subject: 'Finance', A: p.scores.financials, fullMark: 10 },
                          { subject: 'Pitch', A: p.scores.pitch, fullMark: 10 },
                        ]}>
                          <PolarGrid stroke="#E2E8F0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 8, fontWeight: 'bold' }} />
                          <Radar name="Score" dataKey="A" stroke="#F5A623" fill="#F5A623" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-gray-300">
                        <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-10" />
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Awaiting Data</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modals */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Register Participant</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Startup or Founder Name" 
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              className="h-14 rounded-2xl bg-gray-50 border-none font-medium px-6"
            />
          </div>
          <Button 
            className="w-full h-14 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800" 
            onClick={() => addMutation.mutate(newParticipantName)}
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start Evaluation"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
        <DialogContent className="sm:max-w-[550px] bg-white border-none rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col h-[90vh]">
          <div className="p-8 border-b border-gray-50 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black font-heading tracking-tight">{selectedParticipant?.name}</DialogTitle>
                <DialogDescription className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Strategic Interview Scorecard</DialogDescription>
              </div>
              <Badge className="bg-gray-900 text-white px-3 py-1 rounded-full text-[10px] font-bold">2024 BATCH</Badge>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-8">
            <div className="space-y-12 pb-12">
              {(Object.keys(CATEGORY_LABELS) as Array<keyof Scores>).map(key => {
                const currentScore = tempScores?.[key] ?? null;
                return (
                  <div key={key} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="max-w-[70%]">
                        <h4 className="text-base font-black text-gray-900 leading-tight">{CATEGORY_LABELS[key]}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-black text-[#F5A623] bg-[#F5A623]/10 px-2 py-0.5 rounded-full uppercase">Weight: {WEIGHTS[key] * 100}%</span>
                        </div>
                      </div>
                      <div className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center font-black text-2xl transition-all ${currentScore !== null ? 'border-[#F5A623] text-[#F5A623] bg-[#F5A623]/5' : 'border-gray-100 text-gray-300'}`}>
                        {currentScore ?? '0'}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <ul className="space-y-3">
                        {GUIDES[key].map((g, i) => (
                          <li key={i} className="text-[11px] text-gray-500 font-bold flex items-start gap-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#F5A623] mt-1 shrink-0" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                        <button
                          key={num}
                          onClick={() => setTempScores(prev => ({ ...prev!, [key]: num }))}
                          className={`flex-1 min-w-[40px] h-12 rounded-xl font-black text-sm transition-all duration-300 border-2 ${
                            currentScore === num 
                              ? 'bg-[#F5A623] text-white border-[#F5A623] shadow-lg shadow-[#F5A623]/30 scale-110 z-10' 
                              : 'bg-white text-gray-400 border-gray-100 hover:border-[#F5A623]/30 hover:text-[#F5A623]'
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
          </ScrollArea>

          <div className="p-8 border-t border-gray-50 shrink-0 bg-white grid grid-cols-2 gap-4">
            <Button variant="ghost" className="h-14 rounded-2xl text-gray-400 font-black uppercase text-[10px] tracking-widest" onClick={() => setSelectedParticipant(null)}>Discard</Button>
            <Button 
              className="h-14 rounded-2xl bg-[#F5A623] hover:bg-[#e0961e] text-white font-black text-base shadow-xl shadow-[#F5A623]/20" 
              onClick={() => updateMutation.mutate({ id: selectedParticipant!.id, scores: tempScores! })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Scorecard"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
