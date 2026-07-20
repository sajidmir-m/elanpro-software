import { Router, type IRouter } from "express";
import type { UserRole } from "@workspace/supabase";
import { requireAuth } from "../lib/auth";
import { fetchActive, fetchClosed, summarizeLiveOperationsDashboard, type AnalyticsParams } from "../lib/analytics";
import { buildLiveOpsReportHtml } from "../lib/live-ops-report";
import { isEmailConfigured, sendEmail } from "../lib/email";
import { REPORT_AUDIENCE_ROLES, resolveRecipientsByRole, rowsForRecipient, scopeLabelForRecipient } from "../lib/report-recipients";

const router: IRouter = Router();

type SendResult = {
  email: string;
  name: string;
  scope: string;
  status: "sent" | "failed" | "skipped";
  error?: string;
};

function isReportAudienceRole(value: string): value is UserRole {
  return (REPORT_AUDIENCE_ROLES as string[]).includes(value);
}

router.get("/reports/live-operations/recipients", requireAuth, async (_req, res): Promise<void> => {
  try {
    const profiles = await resolveRecipientsByRole(REPORT_AUDIENCE_ROLES);
    res.json(
      profiles.map((p) => ({ id: p.id, name: p.name, email: p.email, role: p.role, isActive: p.is_active })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: (err as Error).message ?? "Failed to load recipients" });
  }
});

router.get("/reports/live-operations/preview", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = req.query as AnalyticsParams;
    const [active, closed] = await Promise.all([fetchActive(params), fetchClosed(params)]);
    const dashboard = summarizeLiveOperationsDashboard(active, closed);
    const html = buildLiveOpsReportHtml(dashboard, { name: "there", scopeLabel: "Company-wide" });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to render report preview" });
  }
});

router.post("/reports/live-operations/send", requireAuth, async (req, res): Promise<void> => {
  try {
    if (!isEmailConfigured()) {
      res.status(400).json({
        message: "Email sending isn't configured yet. Add RESEND_API_KEY to the API server's .env file.",
      });
      return;
    }

    const body = req.body as {
      audiences?: string[];
      filters?: AnalyticsParams;
      extraRecipients?: string[];
      dryRun?: boolean;
    };
    const audiences = (body.audiences ?? []).filter(isReportAudienceRole);
    const extraRecipients = (body.extraRecipients ?? []).filter((e) => typeof e === "string" && e.includes("@"));
    const filters = body.filters ?? {};
    const dryRun = body.dryRun === true;

    if (audiences.length === 0 && extraRecipients.length === 0) {
      res.status(400).json({ message: "Select at least one audience or add a recipient email." });
      return;
    }

    const [active, closed] = await Promise.all([fetchActive(filters), fetchClosed(filters)]);
    const overallDashboard = summarizeLiveOperationsDashboard(active, closed);

    const profiles = await resolveRecipientsByRole(audiences);
    const results: SendResult[] = [];
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    for (const profile of profiles) {
      const isOrgWide = profile.role === "manager" || profile.role === "admin";
      let scopedActive = active;
      let scopedClosed = closed;
      let scoped = false;
      if (!isOrgWide) {
        const activeScope = rowsForRecipient(active, profile);
        scopedActive = activeScope.rows;
        scoped = activeScope.scoped;
        scopedClosed = rowsForRecipient(closed, profile).rows;
      }
      const dashboard = isOrgWide ? overallDashboard : summarizeLiveOperationsDashboard(scopedActive, scopedClosed);
      const scopeLabel = isOrgWide ? "Company-wide" : scopeLabelForRecipient(profile, scoped);
      const html = buildLiveOpsReportHtml(dashboard, { name: profile.name, scopeLabel });
      const subject = `Live Operations Report — ${scopeLabel} — ${today}`;

      if (dryRun) {
        results.push({ email: profile.email, name: profile.name, scope: scopeLabel, status: "skipped" });
        continue;
      }
      try {
        await sendEmail({ to: profile.email, subject, html });
        results.push({ email: profile.email, name: profile.name, scope: scopeLabel, status: "sent" });
      } catch (err) {
        results.push({
          email: profile.email,
          name: profile.name,
          scope: scopeLabel,
          status: "failed",
          error: (err as Error).message,
        });
      }
    }

    for (const email of extraRecipients) {
      const html = buildLiveOpsReportHtml(overallDashboard, { name: email, scopeLabel: "Company-wide" });
      const subject = `Live Operations Report — Company-wide — ${today}`;

      if (dryRun) {
        results.push({ email, name: email, scope: "Company-wide", status: "skipped" });
        continue;
      }
      try {
        await sendEmail({ to: email, subject, html });
        results.push({ email, name: email, scope: "Company-wide", status: "sent" });
      } catch (err) {
        results.push({ email, name: email, scope: "Company-wide", status: "failed", error: (err as Error).message });
      }
    }

    res.json({
      dryRun,
      totalRecipients: results.length,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send live operations report" });
  }
});

export default router;
