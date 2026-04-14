import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, Search, Download, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

const DOCUMENT_BUCKET = "test-vault";

const getDocumentStoragePath = (storedPath: string) => {
  if (!storedPath.startsWith("http")) return storedPath;
  const bucketPathMarker = `/${DOCUMENT_BUCKET}/`;
  const markerIndex = storedPath.indexOf(bucketPathMarker);
  if (markerIndex === -1) return storedPath;
  return decodeURIComponent(storedPath.slice(markerIndex + bucketPathMarker.length));
};

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["global-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          startups (
            name
          )
        `)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleOpenDocument = async (fileUrl: string) => {
    try {
      const filePath = getDocumentStoragePath(fileUrl);
      const { data, error } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(filePath, 60);

      if (error || !data?.signedUrl) throw error || new Error("Could not generate URL");
      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast({
        title: "Failed to open file",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const filteredDocs = documents?.filter((doc) => {
    const searchString = `${doc.file_name} ${doc.startups?.name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight font-heading">Global Document Vault</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          The central repository for all Lab startup documents. Instantly locate, verify, and review Pitch Decks, Cap Tables, and Legal KYC files across the entire portfolio.
        </p>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/30 border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Filing Cabinet</CardTitle>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by file or startup name..."
              className="pl-9 bg-card border-border/50 focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground">No documents found</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {searchTerm ? "Try adjusting your search terms." : "No documents have been uploaded by any startup yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Document Name</TableHead>
                  <TableHead>Startup</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <span className="truncate max-w-[200px] block" title={doc.file_name}>
                          {doc.file_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.startups?.name ? (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {doc.startups.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(doc.uploaded_at).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleOpenDocument(doc.file_url)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View File
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
