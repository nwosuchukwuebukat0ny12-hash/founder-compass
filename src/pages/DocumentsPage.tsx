import { FileText } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Document Vault</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Store and manage important startup documents.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-medium">Coming soon</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Document management is on the way.
        </p>
      </div>
    </div>
  );
}
