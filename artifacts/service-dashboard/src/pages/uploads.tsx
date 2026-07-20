import { useState, useRef, useEffect } from "react";
import { 
  useListUploads, 
  useUploadData, 
  useDeleteUpload,
  getListUploadsQueryKey,
  getGetDashboardSummaryQueryKey,
  UploadInputFileType
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { UploadCloud, FileSpreadsheet, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function invalidateDashboardData(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({}) });
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return (
        key === "live-operations" ||
        key === "live-ops-drilldown" ||
        key === "call-age-dashboard" ||
        key === "closure-operations" ||
        key === "closure-records" ||
        key === "filter-options" ||
        key === "records" ||
        key === "status-calls"
      );
    },
  });
}

export default function Uploads() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seenStatuses = useRef<Map<number, string>>(new Map());
  
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<UploadInputFileType>("active_tickets");
  const [isDragging, setIsDragging] = useState(false);

  const { data: uploads, isLoading } = useListUploads({
    query: { 
      queryKey: getListUploadsQueryKey(),
      refetchInterval: 5000 // Poll every 5s for status updates
    }
  });

  useEffect(() => {
    if (!uploads) return;
    for (const upload of uploads) {
      const prev = seenStatuses.current.get(upload.id);
      seenStatuses.current.set(upload.id, upload.status);
      if (prev && prev !== "completed" && upload.status === "completed") {
        invalidateDashboardData(queryClient);
        toast({
          title: "Data ready",
          description: `${upload.filename} finished processing — dashboards will refresh.`,
        });
      }
    }
  }, [uploads, queryClient, toast]);

  const uploadMutation = useUploadData({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUploadsQueryKey() });
        toast({ title: "File uploaded successfully", description: "Processing has started." });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (err: any) => {
        toast({ title: "Upload failed", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeleteUpload({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUploadsQueryKey() });
        toast({ title: "Upload record deleted" });
      },
      onError: (err: any) => {
        toast({ title: "Delete failed", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        toast({ title: "Invalid file type", description: "Please upload an Excel or CSV file.", variant: "destructive" });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate({ data: { fileType, file } });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Delete this upload record? The imported data may be removed.")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="secondary" className="bg-chart-3/20 text-chart-3 border-chart-3/30"><CheckCircle2 className="size-3 mr-1" /> Success</Badge>;
      case 'processing': return <Badge variant="outline" className="text-chart-2 border-chart-2/50"><Loader2 className="size-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'failed': return <Badge variant="destructive"><AlertCircle className="size-3 mr-1" /> Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Synchronization</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload daily extracts to keep the dashboard current.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-primary/20 shadow-sm h-fit">
          <CardHeader>
            <CardTitle>New Upload</CardTitle>
            <CardDescription>Select the data type and drop the Excel file below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Type</label>
              <Select value={fileType} onValueChange={(v: UploadInputFileType) => setFileType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active_tickets">Active Tickets (WIP)</SelectItem>
                  <SelectItem value="closed_tickets">Closed Tickets (Resolved)</SelectItem>
                  <SelectItem value="mrf_data">MRF / Spares Data</SelectItem>
                  <SelectItem value="sales_data">Sales Data (for BD vs Sales)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div 
              className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'} ${file ? 'border-chart-3/50 bg-chart-3/5' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
              />
              
              {file ? (
                <div className="flex flex-col items-center">
                  <FileSpreadsheet className="size-12 text-chart-3 mb-3" />
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <Button variant="ghost" size="sm" className="mt-4 text-xs h-7" onClick={(e) => { e.stopPropagation(); setFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }}>
                    Remove file
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center cursor-pointer">
                  <UploadCloud className="size-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">Drag & drop your file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse (.xlsx, .csv)</p>
                </div>
              )}
            </div>

            <Button 
              className="w-full" 
              disabled={!file || uploadMutation.isPending} 
              onClick={handleUpload}
            >
              {uploadMutation.isPending ? "Uploading..." : "Start Synchronization"}
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px] font-mono text-xs">Date</TableHead>
                  <TableHead className="font-mono text-xs">File Details</TableHead>
                  <TableHead className="text-right font-mono text-xs">Records</TableHead>
                  <TableHead className="font-mono text-xs text-center">Status</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ) : !uploads || uploads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No upload history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  uploads.map((upload) => (
                    <TableRow key={upload.id} className="group hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">
                        {format(new Date(upload.uploadedAt), "MMM d, yyyy")}
                        <div className="text-muted-foreground">{format(new Date(upload.uploadedAt), "HH:mm:ss")}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm truncate max-w-[200px]" title={upload.filename}>{upload.filename}</div>
                        <Badge variant="outline" className="mt-1 text-[10px] uppercase font-mono">{upload.fileType.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {upload.recordCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(upload.status)}
                        {upload.errorMessage && (
                          <div className="text-[10px] text-destructive mt-1 max-w-[150px] truncate mx-auto" title={upload.errorMessage}>
                            {upload.errorMessage}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(upload.id)}
                          disabled={deleteMutation.isPending || upload.status === 'processing'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
