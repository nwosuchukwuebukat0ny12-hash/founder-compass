import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  CheckCircle2, Circle, Clock, Plus, MoreHorizontal, 
  ArrowRight, ArrowLeft, Building2, Calendar as CalendarIcon, Loader2, Target, X
} from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";

type AdminTask = Tables<"admin_tasks">;
type Startup = Tables<"startups">;

export default function AdminTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    startup_id: "none",
    due_date: ""
  });

  // Fetch Startups for the dropdown
  const { data: startups = [] } = useQuery({
    queryKey: ["admin-startups-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("id, name").order("name");
      if (error) throw error;
      return data;
    }
  });

  // Fetch Admin Tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["admin-tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("admin_tasks")
        .select(`*, startups (name, logo_url)`)
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as (AdminTask & { startups: { name: string; logo_url: string | null } | null })[];
    },
    enabled: !!user
  });

  // Create Task Mutation
  const createTask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user found");
      const { error } = await supabase.from("admin_tasks").insert({
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        status: newTask.status,
        startup_id: newTask.startup_id === "none" ? null : newTask.startup_id,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
        admin_id: user.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      setIsCreateModalOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", status: "todo", startup_id: "none", due_date: "" });
      toast({ title: "Task created!", description: "Your command board has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update Task Status Mutation
  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from("admin_tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    }
  });

  // Delete Task Mutation
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      toast({ title: "Task deleted" });
    }
  });

  const columns = [
    { id: "todo", title: "To Do", icon: Circle, color: "text-slate-400", bg: "bg-slate-50" },
    { id: "in_progress", title: "In Progress", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { id: "completed", title: "Completed", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" }
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Target className="w-8 h-8 text-primary" />
            Command Tasks
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Manage your lab priorities and track startup-specific action items.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          
          return (
            <div key={col.id} className="flex flex-col h-[70vh]">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <col.icon className={`w-5 h-5 ${col.color}`} />
                  <h3 className="font-bold text-gray-900">{col.title}</h3>
                </div>
                <Badge variant="secondary" className="bg-white text-gray-500 shadow-sm">{colTasks.length}</Badge>
              </div>

              <ScrollArea className="flex-1 bg-gray-50/50 rounded-2xl border border-gray-100 p-4">
                <div className="space-y-4">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <div className={`w-12 h-12 rounded-full ${col.bg} mx-auto mb-3 flex items-center justify-center`}>
                        <col.icon className={`w-6 h-6 ${col.color}`} opacity={0.5} />
                      </div>
                      <p className="text-sm text-gray-400">No tasks in this column</p>
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <Card key={task.id} className="border-none shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing bg-white/80 backdrop-blur-sm group">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <Badge className={`
                              ${task.priority === 'high' ? 'bg-red-50 text-red-600 hover:bg-red-100' : ''}
                              ${task.priority === 'medium' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : ''}
                              ${task.priority === 'low' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : ''}
                              border-none uppercase tracking-widest text-[9px] font-bold
                            `}>
                              {task.priority}
                            </Badge>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {col.id !== "todo" && (
                                <button onClick={() => updateTaskStatus.mutate({ id: task.id, status: col.id === 'completed' ? 'in_progress' : 'todo' })} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900">
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {col.id !== "completed" && (
                                <button onClick={() => updateTaskStatus.mutate({ id: task.id, status: col.id === 'todo' ? 'in_progress' : 'completed' })} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900">
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                              <button onClick={() => deleteTask.mutate(task.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 ml-1">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <h4 className="font-bold text-sm text-gray-900 leading-tight mb-2">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
                          )}

                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                            {task.startups ? (
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                                <Building2 className="w-3 h-3 text-primary" />
                                <span className="truncate max-w-[100px]">{task.startups.name}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-300 flex items-center gap-1"><Circle className="w-2 h-2" /> Internal</div>
                            )}

                            {task.due_date && (
                              <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md
                                ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}
                              `}>
                                <CalendarIcon className="w-3 h-3" />
                                {format(new Date(task.due_date), 'MMM d')}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>

      {/* Create Task Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              New Command Task
            </DialogTitle>
            <DialogDescription>
              Create a new action item and link it to a startup if needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Task Title</label>
              <Input 
                value={newTask.title}
                onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Review monthly financials"
                className="bg-gray-50/50 border-gray-200 focus-visible:ring-primary/20 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</label>
                <Select value={newTask.priority} onValueChange={val => setNewTask(prev => ({ ...prev, priority: val }))}>
                  <SelectTrigger className="bg-gray-50/50 border-gray-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Due Date</label>
                <Input 
                  type="date"
                  value={newTask.due_date}
                  onChange={e => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="bg-gray-50/50 border-gray-200 focus-visible:ring-primary/20 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Link to Startup (Optional)</label>
              <Select value={newTask.startup_id} onValueChange={val => setNewTask(prev => ({ ...prev, startup_id: val }))}>
                <SelectTrigger className="bg-gray-50/50 border-gray-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Startup (Internal Task)</SelectItem>
                  {startups.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Description (Optional)</label>
              <Textarea 
                value={newTask.description}
                onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add any extra context or notes here..."
                className="bg-gray-50/50 border-gray-200 focus-visible:ring-primary/20 rounded-xl resize-none h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={() => createTask.mutate()} 
              disabled={createTask.isPending || !newTask.title.trim()}
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
