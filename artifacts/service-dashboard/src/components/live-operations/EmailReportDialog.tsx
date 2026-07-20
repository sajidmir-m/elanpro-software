import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Eye, Loader2, Mail, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  fetchLiveOpsReportPreviewHtml,
  fetchLiveOpsReportRecipients,
  sendLiveOpsReport,
  type AnalyticsQuery,
  type ReportRole,
  type SendLiveOpsReportResult,
} from "@/lib/analytics-api";

const AUDIENCES: Array<{ role: ReportRole; label: string; description: string }> = [
  { role: "rsh", label: "RSH", description: "Each RSH gets their own region's open calls" },
  { role: "ash", label: "ASH / Reporting Manager", description: "Each ASH gets their own workload" },
  { role: "service_partner", label: "Service Partners", description: "Each partner gets their own open calls" },
  { role: "manager", label: "Management", description: "Full company-wide report" },
];

function parseExtraEmails(raw: string): string[] {
  return [...new Set(raw.split(/[\n,;]/).map((s) => s.trim()).filter((s) => s.includes("@")))];
}

export function EmailReportDialog({
  open,
  onOpenChange,
  filters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AnalyticsQuery;
}) {
  const { toast } = useToast();
  const [selectedRoles, setSelectedRoles] = useState<ReportRole[]>([]);
  const [extraEmailsRaw, setExtraEmailsRaw] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [result, setResult] = useState<SendLiveOpsReportResult | null>(null);

  const extraEmails = useMemo(() => parseExtraEmails(extraEmailsRaw), [extraEmailsRaw]);

  const recipients = useQuery({
    queryKey: ["live-ops-report-recipients"],
    queryFn: fetchLiveOpsReportRecipients,
    enabled: open,
    staleTime: 60_000,
  });

  const preview = useQuery({
    queryKey: ["live-ops-report-preview", filters],
    queryFn: () => fetchLiveOpsReportPreviewHtml(filters),
    enabled: open && previewOpen,
  });

  const countFor = (role: ReportRole) => recipients.data?.filter((r) => r.role === role).length ?? 0;

  const toggleRole = (role: ReportRole) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const sendMutation = useMutation({
    mutationFn: () => sendLiveOpsReport({ audiences: selectedRoles, filters, extraRecipients: extraEmails }),
    onSuccess: (data) => {
      setResult(data);
      if (data.failed === 0 && data.sent > 0) {
        toast({ title: `Report sent to ${data.sent} recipient${data.sent === 1 ? "" : "s"}` });
      } else if (data.sent > 0) {
        toast({
          title: `Sent to ${data.sent}, ${data.failed} failed`,
          description: "Check the results below for details.",
        });
      } else {
        toast({ title: "No emails were sent", variant: "destructive" });
      }
    },
    onError: (err: unknown) => {
      toast({
        title: "Failed to send report",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const canSend = selectedRoles.length > 0 || extraEmails.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setResult(null);
          setPreviewOpen(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5" /> Email Live Operations Report
          </DialogTitle>
          <DialogDescription>
            Sends a chart + data snapshot of the currently filtered Live Operations view. RSH, ASH and Service
            Partner recipients each get a report scoped to their own name; Management gets the full view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">Send to</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AUDIENCES.map((audience) => (
                <label
                  key={audience.role}
                  className="flex items-start gap-2.5 rounded-lg border border-border/60 p-3 text-sm hover:bg-muted/40"
                >
                  <Checkbox
                    checked={selectedRoles.includes(audience.role)}
                    onCheckedChange={() => toggleRole(audience.role)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {audience.label}
                      <Badge variant="secondary" className="text-[10px]">
                        {recipients.isLoading ? "…" : countFor(audience.role)}
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">{audience.description}</span>
                  </span>
                </label>
              ))}
            </div>
            {recipients.data && recipients.data.length === 0 && (
              <p className="mt-2 text-xs text-amber-600">
                No RSH/ASH/Service Partner/Management users are registered yet. Add them under Users, or add
                one-off recipients below.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="extra-recipients" className="mb-2 block text-sm font-medium">
              Additional recipients (optional)
            </Label>
            <Textarea
              id="extra-recipients"
              placeholder="name@example.com, another@example.com"
              value={extraEmailsRaw}
              onChange={(e) => setExtraEmailsRaw(e.target.value)}
              className="min-h-16 text-sm"
            />
            {extraEmails.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">{extraEmails.length} extra recipient(s) detected</p>
            )}
          </div>

          <div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPreviewOpen((v) => !v)}>
              <Eye className="size-3.5" />
              {previewOpen ? "Hide preview" : "Preview report"}
            </Button>
            {previewOpen && (
              <div className="mt-2 overflow-hidden rounded-lg border border-border/60">
                {preview.isLoading ? (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" /> Rendering preview…
                  </div>
                ) : preview.error ? (
                  <div className="p-4 text-sm text-destructive">Failed to render preview.</div>
                ) : (
                  <iframe title="Report preview" srcDoc={preview.data ?? ""} className="h-[420px] w-full bg-white" />
                )}
              </div>
            )}
          </div>

          {result && (
            <div className="rounded-lg border border-border/60 p-3">
              <p className="mb-2 text-sm font-medium">
                {result.dryRun ? "Dry run" : "Send"} result — {result.sent} sent, {result.failed} failed
                {result.skipped > 0 ? `, ${result.skipped} skipped` : ""}
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {result.results.map((r) => (
                  <li key={r.email} className="flex items-center gap-1.5">
                    {r.status === "sent" ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    ) : r.status === "failed" ? (
                      <XCircle className="size-3.5 text-destructive" />
                    ) : (
                      <Loader2 className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">({r.email})</span>
                    <span className="text-muted-foreground">· {r.scope}</span>
                    {r.error && <span className="text-destructive">— {r.error}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => sendMutation.mutate()} disabled={!canSend || sendMutation.isPending} className="gap-1.5">
            {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Send Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
