import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Upload, FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GrowthStageBar, type GrowthStage } from "@/components/GrowthStageBar";
import { toast } from "@/hooks/use-toast";

const industryColors: Record<string, string> = {
  FinTech: "bg-blue-50 text-blue-700 border-blue-200",
  HealthTech: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CleanTech: "bg-green-50 text-green-700 border-green-200",
  EdTech: "bg-amber-50 text-amber-700 border-amber-200",
  "AI / ML": "bg-violet-50 text-violet-700 border-violet-200",
};

export default function StartupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: startup, isLoading } = useQuery({
    queryKey: ["startup", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startups")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("startup_id", id!)
        .order("achieved_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("startup_id", id!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const addMilestone = useMutation({
    mutationFn: async (stageNote: string) => {
      const { error } = await supabase.from("milestones").insert({
        startup_id: id!,
        stage_reached: startup?.current_stage ?? "Ideation",
        logged_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", id] });
      setNote("");
      toast({ title: "Mentorship note saved" });
    },
    onError: (error: any) => toast({ title: "Failed to save note", description: error?.message || error?.code || "Unknown error", variant: "destructive" }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploading(true);
    try {
      const filePath = `${id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("test-vault")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Store the storage path, not a public URL (bucket is private)
      const storagePath = filePath;

      const { error: dbError } = await supabase.from("documents").insert({
        startup_id: id,
        file_name: file.name,
        file_url: storagePath,
        uploaded_by: user?.id ?? null,
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["documents", id] });
      toast({ title: "File uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error?.message || error?.code || "Unknown error", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/startups")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Startup not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/startups")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Startups
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{startup.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Founded by {startup.founder_name}</p>
          </div>
          <GrowthStageBar currentStage={(startup.current_stage as GrowthStage) ?? "Ideation"} />
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vault">Document Vault</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Founder</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{startup.founder_name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Industry</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className={industryColors[startup.industry ?? ""] ?? ""}>
                  {startup.industry ?? "—"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Mentorship Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mentorship Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a mentorship note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  size="icon"
                  className="shrink-0 self-end"
                  disabled={!note.trim() || addMilestone.isPending}
                  onClick={() => addMilestone.mutate(note)}
                >
                  {addMilestone.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No milestones logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {milestones.map((m) => (
                    <div key={m.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{m.stage_reached}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.achieved_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Vault Tab */}
        <TabsContent value="vault" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-12 transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <p className="mt-2 text-sm font-medium">
                  {uploading ? "Uploading..." : "Click to upload a file"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, or any file type</p>
              </button>
            </CardContent>
          </Card>

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={async () => {
                    const { data, error } = await supabase.storage
                      .from("test-vault")
                      .createSignedUrl(doc.file_url, 60);
                    if (error || !data?.signedUrl) {
                      toast({ title: "Failed to open file", description: error?.message ?? "Unknown error", variant: "destructive" });
                      return;
                    }
                    window.open(data.signedUrl, "_blank");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
