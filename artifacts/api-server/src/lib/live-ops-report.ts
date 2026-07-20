import type { summarizeLiveOperationsDashboard } from "./analytics";

type LiveOpsDashboard = ReturnType<typeof summarizeLiveOperationsDashboard>;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Bars are plain table cells with inline-styled widths — renders reliably in email clients without images. */
function renderBarRow(label: string, count: number, pct: number, color: string): string {
  const width = Math.max(2, Math.min(100, pct));
  return `
    <tr>
      <td style="padding:6px 10px 6px 0;font-size:12px;color:#344054;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;width:100%;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F7;border-radius:6px;">
          <tr>
            <td style="background:${color};width:${width}%;height:14px;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td>
            <td></td>
          </tr>
        </table>
      </td>
      <td style="padding:6px 0 6px 10px;font-size:12px;font-weight:600;color:#111827;white-space:nowrap;text-align:right;">
        ${count.toLocaleString()} <span style="color:#98A2B3;font-weight:400;">(${pct}%)</span>
      </td>
    </tr>`;
}

function renderKpiCard(label: string, value: string | number, color: string): string {
  return `
    <td style="padding:0 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E7EAF0;border-radius:10px;">
        <tr>
          <td style="padding:14px 16px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#667085;">${escapeHtml(label)}</div>
            <div style="font-size:24px;font-weight:700;color:${color};margin-top:4px;">${escapeHtml(value)}</div>
          </td>
        </tr>
      </table>
    </td>`;
}

function renderTable(
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): string {
  const headerHtml = headers
    .map(
      (h, i) =>
        `<th style="padding:8px 10px;font-size:10px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#667085;text-align:${
          i === 0 ? "left" : "right"
        };border-bottom:1px solid #E7EAF0;">${escapeHtml(h)}</th>`,
    )
    .join("");

  const bodyHtml = rows.length
    ? rows
        .map(
          (row) => `
      <tr>
        ${row
          .map(
            (cell, i) => `
          <td style="padding:8px 10px;font-size:12px;color:#344054;text-align:${
            i === 0 ? "left" : "right"
          };border-bottom:1px solid #F2F4F7;">${escapeHtml(cell)}</td>`,
          )
          .join("")}
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="${headers.length}" style="padding:16px;text-align:center;font-size:12px;color:#98A2B3;">No data for this scope</td></tr>`;

  return `
    <div style="margin-top:18px;">
      <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;">${escapeHtml(title)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E7EAF0;border-radius:10px;overflow:hidden;">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`;
}

export function buildLiveOpsReportHtml(
  dashboard: LiveOpsDashboard,
  recipient: { name: string; scopeLabel: string },
): string {
  const statusSegments = dashboard.charts.statusBreakdown.segments;
  const topPartners = dashboard.charts.topPartners.items.slice(0, 8);
  const topRsh = dashboard.opsOverview.topRsh.slice(0, 8);
  const topAsh = dashboard.opsOverview.topManagers.slice(0, 8);
  const generatedAt = new Date(dashboard.refreshedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#111827;padding:22px 28px;">
                <div style="font-size:18px;font-weight:700;color:#FFFFFF;">Live Operations Report</div>
                <div style="font-size:12px;color:#98A2B3;margin-top:2px;">
                  ${escapeHtml(recipient.scopeLabel)} · Generated ${escapeHtml(generatedAt)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <div style="font-size:13px;color:#344054;line-height:1.6;background:#F7F8FA;border-radius:10px;padding:12px 14px;">
                  Hi ${escapeHtml(recipient.name)}, here is the current snapshot of open service calls${
                    recipient.scopeLabel === "Company-wide" ? "" : ` for ${escapeHtml(recipient.scopeLabel)}`
                  }. ${escapeHtml(dashboard.executiveSummary)}
                </div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                  <tr>
                    ${renderKpiCard("Open Calls", dashboard.totalTickets.toLocaleString(), "#2563EB")}
                    ${renderKpiCard("Assigned", dashboard.kpis.assigned.value.toLocaleString(), "#2563EB")}
                    ${renderKpiCard("WIP", dashboard.kpis.wip.value.toLocaleString(), "#F59E0B")}
                    ${renderKpiCard("MRF Pending", dashboard.kpis.mrf.value.toLocaleString(), "#8B5CF6")}
                  </tr>
                </table>

                <div style="margin-top:20px;font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;">
                  Open Calls by Status
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${statusSegments
                    .map((s) =>
                      renderBarRow(
                        s.label,
                        s.count,
                        dashboard.totalTickets > 0 ? Math.round((s.count / dashboard.totalTickets) * 100) : 0,
                        s.color,
                      ),
                    )
                    .join("")}
                </table>

                ${renderTable(
                  "Top RSH Workload",
                  ["RSH", "Open Calls", "Critical", "SLA %"],
                  topRsh.map((r) => [r.rsh, r.openCalls, r.critical, `${r.sla}%`]),
                )}

                ${renderTable(
                  "Top ASH / Reporting Manager Workload",
                  ["ASH", "Open Calls", "Critical", "Avg Age (d)"],
                  topAsh.map((a) => [a.name, a.openCalls, a.criticalCalls, a.avgAge]),
                )}

                ${renderTable(
                  "Top Service Partners",
                  ["Service Partner", "Open Calls", "Share"],
                  topPartners.map((p) => [p.label, p.count, `${p.pct}%`]),
                )}

                <div style="margin-top:22px;padding-top:16px;border-top:1px solid #E7EAF0;font-size:11px;color:#98A2B3;">
                  This is an automated report from Report Automation Hub. Data reflects the filters applied when the report was sent.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
