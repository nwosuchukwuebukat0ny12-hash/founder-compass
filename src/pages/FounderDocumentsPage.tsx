import { useState } from "react";
import { 
  FileText, ShieldCheck, Clock, AlertCircle, Upload, 
  Search, FileCode, Landmark, UserCheck, Briefcase, 
  ArrowUpRight, Download, Filter, MoreHorizontal, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// --- CORE DOCUMENT TEMPLATES (The Lab Checklist) ---
const DOCUMENT_TEMPLATES = [
  {
    id: "pitch-deck",
    category: "strategy",
    title: "Pitch Deck",
    description: "The Big Idea: Problem, Solution, Market, Ask.",
    labFocus: "Does it make sense?"
  },
  {
    id: "roadmap",
    category: "strategy",
    title: "Product Roadmap",
    description: "MVP timeline and big launch milestones.",
    labFocus: "Can they build it?"
  },
  {
    id: "cap-table",
    category: "financial",
    title: "Founder Bio & Cap Table",
    description: "Team ownership split and equity structure.",
    labFocus: "Fair ownership?"
  },
  {
    id: "legal-kyc",
    category: "legal",
    title: "Legal & KYC",
    description: "CAC, Tax ID, Government IDs.",
    labFocus: "Is it legal?"
  },
  {
    id: "term-sheet",
    category: "legal",
    title: "Term Sheet / MOU",
    description: "Valuation and decision rules.",
    labFocus: "Fair deal?"
  },
  {
    id: "financial-model",
    category: "financial",
    title: "Financial Model",
    description: "Burn rate and profitability projection.",
    labFocus: "Will they run out of money?"
  }
];

export default function FounderDocumentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get Startup ID
  const { data: startupId } = useQuery({
    queryKey: ["founder-startup-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("startup_id").eq("id", user.id).single();
      return data?.startup_id;
    },
    enabled: !!user,
  });

  // Fetch actual uploaded documents
  const { data: uploadedDocs = [] } = useQuery({
    queryKey: ["startup-documents", startupId],
    queryFn: async () => {
      if (!startupId) return [];
      const { data } = await supabase.from("documents").select("*").eq("startup_id", startupId);
      return data || [];
    },
    enabled: !!startupId,
  });

  // Map templates to real status
  const mappedDocs = DOCUMENT_TEMPLATES.map(template => {
    // Check if any uploaded document matches this template (by checking if the file name contains the template id)
    // In a production app, we would have a specific document_type column, but for now we pattern match the name.
    const uploadedFile = uploadedDocs.find(d => d.file_name.toLowerCase().includes(template.id.toLowerCase()));
    
    return {
      ...template,
      status: uploadedFile ? "Verified" : "Missing",
      lastUpdated: uploadedFile ? new Date(uploadedFile.uploaded_at).toLocaleDateString() : null,
      file_url: uploadedFile?.file_url || null
    };
  });

  const filteredDocs = mappedDocs.filter(doc => {
    const matchesTab = activeTab === "all" || doc.category === activeTab;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const readinessScore = mappedDocs.length > 0 
    ? Math.round((mappedDocs.filter(d => d.status === "Verified").length / mappedDocs.length) * 100)
    : 0;

  const queryClient = useQueryClient();

  const uploadDocMutation = useMutation({
    mutationFn: async ({ file, templateId }: { file: File, templateId: string }) => {
      const fileExt = file.name.split('.').pop();
      // Ensure the file name contains the templateId so our matching logic works
      const fileName = `${templateId}_${Math.random()}.${fileExt}`;
      
      // Using 'vault' bucket for secure document storage
      const { error: uploadError } = await supabase.storage.from('vault').upload(fileName, file);
      if (uploadError) throw uploadError;

      // SECURITY: We store the FILE PATH, not the public URL.
      const { error: dbError } = await supabase.from('documents').insert({
        startup_id: startupId,
        file_name: fileName,
        file_url: fileName, // This now represents the storage path
      });
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["startup-documents"] });
      toast({ title: "Document uploaded successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, templateId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocMutation.mutate({ file, templateId });
    }
  };

  const handleViewDocument = async (filePath: string) => {
    // SECURITY: Generate a temporary 60-second signed URL for the private bucket
    const { data, error } = await supabase.storage
      .from('vault')
      .createSignedUrl(filePath, 60);

    if (error) {
      toast({ title: "Access Denied", description: "Could not generate a secure link.", variant: "destructive" });
      return;
    }

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Verified": return "bg-[#00D395]/10 text-[#00D395] border-[#00D395]/20";
      case "Pending": return "bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/20";
      case "Expired": return "bg-[#FF4D4F]/10 text-[#FF4D4F] border-[#FF4D4F]/20";
      default: return "bg-gray-100 text-gray-500 border-gray-200 border-dashed";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Verified": return <ShieldCheck className="w-4 h-4" />;
      case "Pending": return <Clock className="w-4 h-4" />;
      case "Expired": return <AlertCircle className="w-4 h-4" />;
      default: return <Upload className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* 1. HERO SECTION: READINESS SCORE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[#1A1A1A] font-serif">Document Vault</h1>
            <Badge className="bg-[#00D395]/10 text-[#00D395] border-none text-[10px] uppercase font-bold tracking-widest px-2 py-0.5">Secure Data Room</Badge>
          </div>
          <p className="text-gray-500 text-base leading-relaxed max-w-2xl font-medium">
            This is your secure document vault. Upload key files like your pitch deck, cap table, and legal documents so everything stays organized in one place for the Lab team.
          </p>
        </div>
        
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden relative rounded-2xl">
          <div className="absolute top-0 right-0 p-3 opacity-5">
            <Landmark className="w-20 h-20 text-[#00D395]" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-widest font-bold text-gray-500">Readiness Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-[#1A1A1A] tracking-tighter">{readinessScore}%</span>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Due Diligence Ready</span>
            </div>
            <Progress value={readinessScore} className="h-1.5 bg-gray-100 [&>div]:bg-[#00D395]" />
            <p className="text-[10px] text-gray-500 leading-tight font-medium">
              {readinessScore === 100 ? "Congrats! You are fully investment ready." : "Upload missing documents to increase your fundability score."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. CONTROLS: TABS + SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-gray-200">
        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="bg-white border border-gray-200 p-1 rounded-full shadow-sm">
            <TabsTrigger value="all" className="text-xs data-[state=active]:bg-[#00D395] data-[state=active]:text-white rounded-full font-bold">All Documents</TabsTrigger>
            <TabsTrigger value="strategy" className="text-xs data-[state=active]:bg-[#00D395] data-[state=active]:text-white rounded-full font-bold">Strategy</TabsTrigger>
            <TabsTrigger value="legal" className="text-xs data-[state=active]:bg-[#00D395] data-[state=active]:text-white rounded-full font-bold">Legal</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs data-[state=active]:bg-[#00D395] data-[state=active]:text-white rounded-full font-bold">Financial</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search vault..." 
              className="bg-white border-gray-200 pl-9 text-sm text-[#1A1A1A] focus-visible:ring-[#00D395] shadow-sm rounded-full" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <input 
            type="file" 
            id="upload-generic" 
            className="hidden" 
            onChange={(e) => handleFileUpload(e, "generic-doc")} 
          />
          <Button 
            className="bg-[#00D395] hover:bg-[#00A389] text-white gap-2 font-bold shadow-sm rounded-full"
            onClick={() => document.getElementById('upload-generic')?.click()}
            disabled={uploadDocMutation.isPending}
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload New</span>
          </Button>
        </div>
      </div>

      {/* 3. DOCUMENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => (
          <Card 
            key={doc.id} 
            className={`group transition-all duration-300 border-gray-200 bg-white hover:border-[#00D395]/40 hover:shadow-md rounded-2xl ${doc.status === 'Missing' ? 'border-dashed border-gray-300 bg-gray-50/50' : ''}`}
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 group-hover:bg-[#00D395]/10 group-hover:border-[#00D395]/30 transition-colors">
                {doc.category === 'strategy' ? <FileText className="w-5 h-5 text-[#00D395]" /> : 
                 doc.category === 'legal' ? <ShieldCheck className="w-5 h-5 text-[#878A22]" /> : 
                 <Landmark className="w-5 h-5 text-[#F5A623]" />}
              </div>
              <Badge className={`text-[9px] uppercase font-bold px-2 py-0.5 border flex items-center gap-1 ${getStatusStyle(doc.status)}`}>
                {getStatusIcon(doc.status)}
                {doc.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A] group-hover:text-[#00D395] transition-colors">{doc.title}</h3>
                <p className="text-[12px] text-gray-500 mt-1 leading-relaxed line-clamp-2 font-medium">{doc.description}</p>
              </div>
              
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Lab Focus</span>
                  <span className="text-[11px] text-[#1A1A1A] italic font-semibold">{doc.labFocus}</span>
                </div>
              </div>

              {doc.lastUpdated && (
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center text-gray-500 font-medium">
                    <Clock className="w-3 h-3 mr-1.5" />
                    Updated: {doc.lastUpdated}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 border-t border-gray-100 bg-gray-50/50 group-hover:bg-gray-50 transition-colors rounded-b-2xl">
              <div className="flex w-full items-center justify-between">
                {doc.status === 'Missing' || doc.status === 'Expired' ? (
                  <>
                    <input 
                      type="file" 
                      id={`upload-${doc.id}`} 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, doc.id)} 
                    />
                    <Button 
                      variant="ghost" 
                      className="w-full text-xs text-[#00D395] font-bold hover:text-[#00A389] hover:bg-[#00D395]/10 gap-2 h-8" 
                      onClick={() => document.getElementById(`upload-${doc.id}`)?.click()}
                      disabled={uploadDocMutation.isPending}
                    >
                      <Upload className="w-3.5 h-3.5" /> 
                      {uploadDocMutation.isPending ? "Uploading..." : "Upload Document"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[#1A1A1A] font-bold h-8 text-[11px] gap-1.5" onClick={() => {
                      if (doc.file_url) handleViewDocument(doc.file_url);
                    }}>
                      <ArrowUpRight className="w-3.5 h-3.5" /> View
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[#1A1A1A] font-bold h-8 text-[11px] gap-1.5" onClick={() => {
                        if (doc.file_url) handleViewDocument(doc.file_url);
                      }}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}

        {/* MOCK: EMPTY STATE FOR SEARCH */}
        {filteredDocs.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 border border-dashed border-gray-300 rounded-2xl bg-white">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[#1A1A1A] font-bold">No documents found</h3>
              <p className="text-gray-500 text-sm font-medium">Try adjusting your search or filters.</p>
            </div>
            <Button variant="outline" className="border-gray-200 text-gray-600 font-bold" onClick={() => {setActiveTab("all"); setSearchQuery("");}}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      {/* 4. FOOTER: SYSTEM STATUS */}
      <div className="flex items-center gap-2 p-4 rounded-xl bg-[#00D395]/5 border border-[#00D395]/10 shadow-sm">
        <CheckCircle2 className="w-4 h-4 text-[#00D395]" />
        <p className="text-xs text-[#00D395] font-bold uppercase tracking-widest">
          All documents are encrypted and accessible only to authorized Lab Leads.
        </p>
      </div>

    </div>
  );
}
