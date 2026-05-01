import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Target, 
  Flame, 
  Calendar, 
  ChevronRight,
  MoreVertical,
  Flag,
  ArrowUpRight,
  Filter,
  Search,
  LayoutGrid,
  List,
  Loader2,
  Trash2,
  Pencil
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const ProgressRing = ({ progress, size = 60, strokeWidth = 5, color = "#00D395" }: { progress: number, size?: number, strokeWidth?: number, color?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-500 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-[#1A1A1A]">{progress}%</span>
    </div>
  );
};

export default function FounderTargetsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newTask, setNewTask] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [progressInput, setProgressInput] = useState("");
  const [newTargetTitle, setNewTargetTitle] = useState("");
  const [newTargetGoal, setNewTargetGoal] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["milestones", "by_founder", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("founder_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!profile?.startup_id) throw new Error("No startup ID");
      const { data, error } = await supabase.from("milestones").insert({
        startup_id: profile.startup_id,
        founder_id: user?.id,
        title,
        type: "task",
        status: "Today",
        priority: "Medium",
        category: "General"
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      setNewTask("");
      toast.success("Task added successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to add task: " + error.message);
    }
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { data, error } = await supabase
        .from("milestones")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, currentValue, targetValue }: { id: string, currentValue: number, targetValue?: number }) => {
      let progress = 0;
      if (targetValue && targetValue > 0) {
        progress = Math.min(Math.round((currentValue / targetValue) * 100), 100);
      }
      const { data, error } = await supabase
        .from("milestones")
        .update({ current_value: currentValue, progress: progress || 0 })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
    }
  });

  const addTargetMutation = useMutation({
    mutationFn: async ({ title, goal }: { title: string, goal?: number }) => {
      if (!profile?.startup_id) throw new Error("No startup ID");
      const { data, error } = await supabase.from("milestones").insert({
        startup_id: profile.startup_id,
        founder_id: user?.id,
        title,
        type: "target",
        status: "Active",
        priority: "High",
        category: "General",
        progress: 0,
        target_value: goal || null,
        current_value: 0
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("Target added successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to add target: " + error.message);
    }
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("Task deleted");
    }
  });

  const addTask = () => {
    if (!newTask.trim()) return;
    addTaskMutation.mutate(newTask);
  };

  const handleAddTarget = () => {
    if (newTargetTitle.trim()) {
      const goalNum = newTargetGoal ? parseFloat(newTargetGoal) : undefined;
      addTargetMutation.mutate({ title: newTargetTitle.trim(), goal: goalNum });
      setNewTargetTitle("");
      setNewTargetGoal("");
      setIsDialogOpen(false);
    }
  };

  const handleAddHeaderTask = () => {
    if (newTaskTitle.trim()) {
      addTaskMutation.mutate(newTaskTitle.trim());
      setNewTaskTitle("");
      setIsTaskDialogOpen(false);
    }
  };

  const toggleTaskStatus = (task: any) => {
    const newStatus = task.status === "Done" ? "Today" : "Done";
    updateMilestoneMutation.mutate({ id: task.id, updates: { status: newStatus } });
    if (newStatus === "Done") {
      toast.success("Task marked as complete! 🎉");
    }
  };

  const toggleTaskPriority = (task: any) => {
    const newPriority = task.priority === "High" ? "Medium" : "High";
    const newPinned = newPriority === "High"; // Automatically pin high priority tasks
    updateMilestoneMutation.mutate({ id: task.id, updates: { priority: newPriority, is_pinned: newPinned } });
  };

  const openProgressDialog = (target: any) => {
    setSelectedTarget(target);
    setProgressInput(String(target.current_value || 0));
    setIsProgressDialogOpen(true);
  };

  const handleProgressUpdate = () => {
    if (!selectedTarget) return;
    const val = parseFloat(progressInput);
    if (isNaN(val)) return;
    updateProgressMutation.mutate({ 
      id: selectedTarget.id, 
      currentValue: val, 
      targetValue: selectedTarget.target_value ?? undefined 
    });
    setIsProgressDialogOpen(false);
    setSelectedTarget(null);
    toast.success("Progress updated! Keep pushing! 🔥");
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00D395]" />
      </div>
    );
  }

  const targets = milestones?.filter(m => m.type === "target") || [];
  const tasks = milestones?.filter(m => m.type === "task") || [];

  return (
    <div className="min-h-screen text-[#1A1A1A] p-6 space-y-8 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A] flex items-center gap-3 font-serif">
            Command Center <Badge className="bg-[#00D395]/10 text-[#00D395] border-none font-bold">Live</Badge>
          </h1>
          <p className="text-gray-500 mt-1.5 flex items-center gap-2 font-medium">
            <Flame className="w-4 h-4 text-[#F5A623]" /> 
            Focusing on revenue scaling and team expansion this month.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#00D395] text-[#00D395] hover:bg-[#00D395]/10 rounded-full h-9 px-4 text-xs font-bold shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">New Action Task</DialogTitle>
                <DialogDescription>
                  What needs to be done today? This will show up in your daily focus.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Finalize candidate shortlist"
                  className="h-12 bg-gray-50 border-gray-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHeaderTask()}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" className="h-11 rounded-full font-bold">Cancel</Button>
                </DialogClose>
                <Button 
                  onClick={handleAddHeaderTask} 
                  disabled={!newTaskTitle.trim() || addTaskMutation.isPending}
                  className="h-11 rounded-full bg-[#00D395] hover:bg-[#00A389] text-white font-bold px-6"
                >
                  {addTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00D395] hover:bg-[#00A389] text-white rounded-full h-9 px-4 text-xs font-bold shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> New Target
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">New Strategic Target</DialogTitle>
                <DialogDescription>
                  Set a major goal for your business. You can track progress against this target throughout the quarter.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Name</label>
                  <Input
                    value={newTargetTitle}
                    onChange={(e) => setNewTargetTitle(e.target.value)}
                    placeholder="e.g., Hit $10k MRR by Q4"
                    className="h-12 bg-gray-50 border-gray-200"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Goal Number (Optional)</label>
                  <Input
                    type="number"
                    value={newTargetGoal}
                    onChange={(e) => setNewTargetGoal(e.target.value)}
                    placeholder="e.g., 200"
                    className="h-12 bg-gray-50 border-gray-200"
                  />
                  <p className="text-[10px] text-gray-400 font-medium italic">Leave blank if you prefer manual percentage tracking.</p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" className="h-11 rounded-full font-bold">Cancel</Button>
                </DialogClose>
                <Button 
                  onClick={handleAddTarget} 
                  disabled={!newTargetTitle.trim() || addTargetMutation.isPending}
                  className="h-11 rounded-full bg-[#00D395] hover:bg-[#00A389] text-white font-bold px-6"
                >
                  {addTargetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Target
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: STRATEGIC TARGETS (40%) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Strategic Targets</h2>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-[#1A1A1A] font-bold">View All</Button>
          </div>

          <div className="space-y-4">
            {targets.length === 0 ? (
              <Card className="bg-white border-dashed border-gray-200 shadow-sm rounded-2xl p-8 text-center">
                <Target className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-700">No targets yet</h3>
                <p className="text-xs text-gray-500 mt-1">Set a big goal to start tracking progress.</p>
              </Card>
            ) : (
              targets.map((target) => (
                <Card key={target.id} className="bg-white border-gray-200 hover:border-[#00D395]/30 transition-colors shadow-sm rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="p-5 flex items-center gap-5">
                      <ProgressRing progress={target.progress || 0} color={target.status === "Delayed" ? "#FF4D4F" : target.status === "Achieved" ? "#00D395" : "#878A22"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{target.category || 'General'}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-tighter rounded-full px-2 py-0 h-4 ${
                              target.status === "On Track" ? "border-[#878A22]/30 text-[#878A22] bg-[#878A22]/5" :
                              target.status === "Delayed" ? "border-[#FF4D4F]/30 text-[#FF4D4F] bg-[#FF4D4F]/5" :
                              "border-[#00D395]/30 text-[#00D395] bg-[#00D395]/5"
                            }`}>
                              {target.status || 'Active'}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="focus:outline-none"><MoreVertical className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openProgressDialog(target)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> Update Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleTaskPriority(target)}>
                                  <Flag className="w-3.5 h-3.5 mr-2" /> {target.priority === "High" ? "Unpin from Dashboard" : "Pin to Dashboard"}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500" onClick={() => deleteMilestoneMutation.mutate(target.id)}>
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Target
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <h3 className="text-sm font-bold text-[#1A1A1A] truncate group-hover:text-[#00D395] transition-colors">{target.title}</h3>
                        
                        {target.target_value ? (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-gray-500 font-medium">{target.current_value || 0} / {target.target_value}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openProgressDialog(target)}
                              className="h-7 text-[10px] text-[#00D395] hover:bg-[#00D395]/10 font-bold rounded-full px-3"
                            >
                              <Pencil className="w-3 h-3 mr-1" /> Log Progress
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openProgressDialog(target)}
                              className="h-7 text-[10px] text-[#00D395] hover:bg-[#00D395]/10 font-bold rounded-full px-3"
                            >
                              <Pencil className="w-3 h-3 mr-1" /> Update
                            </Button>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium">
                            {target.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due {new Date(target.deadline).toLocaleDateString()}</span>}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); toggleTaskPriority(target); }} className="focus:outline-none" title="Pin to Dashboard">
                            <Flag className={`w-3.5 h-3.5 ${target.priority === "High" ? "text-[#FF4D4F] fill-current" : "text-gray-300 hover:text-gray-400"}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Quick Insights */}
          <Card className="bg-white border-gray-200 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <h4 className="text-xs font-bold text-[#1A1A1A] mb-4 flex items-center gap-2 uppercase tracking-widest">
                <Target className="w-4 h-4 text-[#00D395]" /> Momentum Check
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-gray-500 font-semibold">Active Targets Progress</span>
                  <span className="text-[#1A1A1A] font-bold">
                    {targets.length > 0 ? Math.round(targets.reduce((acc, t) => acc + (t.progress || 0), 0) / targets.length) : 0}%
                  </span>
                </div>
                <Progress value={targets.length > 0 ? Math.round(targets.reduce((acc, t) => acc + (t.progress || 0), 0) / targets.length) : 0} className="h-1.5 bg-gray-100 [&>div]:bg-[#00D395]" />
                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  Focus on closing out your high priority tasks today to keep momentum up.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: DAILY FOCUS (60%) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Founder Focus</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-[#00D395]"><Search className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-[#00D395]"><Filter className="w-4 h-4" /></Button>
            </div>
          </div>

          <Card className="bg-white border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Press '+' to add a new task..." 
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D395]/50 transition-all shadow-sm disabled:opacity-50"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  disabled={addTaskMutation.isPending}
                />
              </div>
            </div>
            
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {/* SECTION: ACTIVE TASKS */}
                <div className="px-6 py-4 bg-white">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00D395] mr-2"></span> Active Tasks
                  </h4>
                  <div className="space-y-1">
                    {tasks.filter(t => t.status !== "Done").length === 0 ? (
                       <p className="text-xs text-gray-400 py-2">No active tasks.</p>
                    ) : (
                      tasks.filter(t => t.status !== "Done").map(task => (
                        <div key={task.id} className="flex items-center group py-2.5 px-3 -mx-3 rounded-xl hover:bg-[#F9F6F2] transition-all cursor-pointer">
                          <div 
                            onClick={() => toggleTaskStatus(task)}
                            className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center mr-4 group-hover:border-[#00D395] transition-colors flex-shrink-0 bg-white"
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#00D395] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#1A1A1A] font-semibold">{task.title}</p>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            {task.category && <Badge variant="outline" className="text-[9px] h-5 rounded-md border-gray-200 text-gray-500 font-bold">{task.category}</Badge>}
                            <button onClick={() => toggleTaskPriority(task)} className="focus:outline-none" title="Mark as high priority">
                              <Flag className={`w-3.5 h-3.5 ${task.priority === "High" ? "text-[#FF4D4F] fill-current" : "text-gray-300 hover:text-gray-400"}`} />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="focus:outline-none"><MoreVertical className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => updateMilestoneMutation.mutate({ id: task.id, updates: { status: "Backlog" } })}>Move to Backlog</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500" onClick={() => deleteMilestoneMutation.mutate(task.id)}>Delete Task</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* SECTION: DONE */}
                <div className="px-6 py-4 bg-gray-50/50">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span> Completed
                  </h4>
                  <div className="space-y-1">
                    {tasks.filter(t => t.status === "Done").length === 0 ? (
                       <p className="text-xs text-gray-400 py-2">No completed tasks yet.</p>
                    ) : (
                      tasks.filter(t => t.status === "Done").map(task => (
                        <div key={task.id} className="flex items-center group py-2.5 px-3 -mx-3 rounded-xl hover:bg-white transition-all cursor-pointer">
                          <div 
                            onClick={() => toggleTaskStatus(task)}
                            className="w-5 h-5 rounded-full border-none bg-[#00D395] flex items-center justify-center mr-4 flex-shrink-0"
                          >
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 opacity-50 line-through">
                            <p className="text-[13px] text-gray-600 font-medium">{task.title}</p>
                          </div>
                          <div className="flex items-center gap-3 ml-4 opacity-40 group-hover:opacity-100 transition-opacity">
                             <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="focus:outline-none"><MoreVertical className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-red-500" onClick={() => deleteMilestoneMutation.mutate(task.id)}>Delete Task</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Productivity Tip */}
          <div className="p-4 rounded-2xl border border-[#878A22]/20 bg-[#878A22]/5 flex items-start gap-3">
            <div className="p-2 bg-[#878A22]/10 rounded-xl">
              <ArrowUpRight className="w-4 h-4 text-[#878A22]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest mb-1">Focus Tip</p>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">Founders who complete 3 high-priority tasks before 11 AM are 40% more likely to hit their monthly MRR targets.</p>
            </div>
          </div>
        </div>
      </div>

      {/* LOG PROGRESS DIALOG */}
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Log Your Progress</DialogTitle>
            <DialogDescription>
              How far have you gone with <strong className="text-[#1A1A1A]">"{selectedTarget?.title}"</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedTarget?.target_value ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Total</label>
                  <Input
                    type="number"
                    value={progressInput}
                    onChange={(e) => setProgressInput(e.target.value)}
                    placeholder="e.g., 50"
                    className="h-12 bg-gray-50 border-gray-200 text-lg font-bold"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleProgressUpdate()}
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Goal</span>
                    <span className="text-sm font-bold text-[#1A1A1A]">{selectedTarget.target_value}</span>
                  </div>
                  <Progress 
                    value={selectedTarget.target_value > 0 ? Math.min(Math.round((parseFloat(progressInput || '0') / selectedTarget.target_value) * 100), 100) : 0} 
                    className="h-2 bg-gray-200 [&>div]:bg-[#00D395]" 
                  />
                  <p className="text-center text-lg font-bold text-[#00D395] mt-2">
                    {selectedTarget.target_value > 0 ? Math.min(Math.round((parseFloat(progressInput || '0') / selectedTarget.target_value) * 100), 100) : 0}% Complete
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress (%)</label>
                <Input
                  type="number"
                  value={progressInput}
                  onChange={(e) => setProgressInput(e.target.value)}
                  placeholder="e.g., 60"
                  className="h-12 bg-gray-50 border-gray-200 text-lg font-bold"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleProgressUpdate()}
                />
                <p className="text-[10px] text-gray-400 font-medium italic">Enter a number between 0 and 100.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="h-11 rounded-full font-bold">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleProgressUpdate}
              disabled={!progressInput || updateProgressMutation.isPending}
              className="h-11 rounded-full bg-[#00D395] hover:bg-[#00A389] text-white font-bold px-6"
            >
              {updateProgressMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
