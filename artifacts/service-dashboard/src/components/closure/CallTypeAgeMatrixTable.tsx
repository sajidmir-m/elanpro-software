import { Card, CardContent } from "@/components/ui/card";
import type { CallTypeAgeMatrix } from "@/lib/analytics-api";

/**
 * Call Type × Customer Category × Age-in-hours matrix (count + percentage per
 * cell). When a Customer Name filter is active on the page, the backend
 * pivots this to Customer Name × Call Type so the same table becomes a
 * per-customer breakdown.
 */
export function CallTypeAgeMatrixTable({ matrix }: { matrix: CallTypeAgeMatrix }) {
  const groupLabel =
    matrix.groupBy === "customerName" ? "Customer Name" : "Customer Category";
  const buckets = matrix.buckets ?? [];
  const rows = matrix.rows ?? [];

  return (
    <Card className="rounded-xl border border-[#E7EAF0] bg-white shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-[14px] font-semibold text-[#111827]">Call Type × {groupLabel} × Age</h3>
        <p className="mt-0.5 text-[11px] text-[#667085]">
          {matrix.groupBy === "customerName"
            ? "Age-in-hours breakdown for the selected customer, by call type."
            : "Non Part vs. Part tickets, by customer category and closure age."}
        </p>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#98A2B3]">No closure data for current filters.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E7EAF0]">
                  <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
                    Call Type
                  </th>
                  <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
                    {groupLabel}
                  </th>
                  {buckets.map((bucket) => (
                    <th
                      key={bucket}
                      className="py-2 pr-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#667085]"
                    >
                      {bucket}
                    </th>
                  ))}
                  <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const prevCallType = idx > 0 ? rows[idx - 1].callType : null;
                  const isNewGroup = row.callType !== prevCallType;
                  return (
                    <tr
                      key={`${row.callType}-${row.groupLabel}`}
                      className={`border-b border-[#F2F4F7] ${isNewGroup ? "border-t border-t-[#E7EAF0]" : ""}`}
                    >
                      <td className="py-2 pr-3 text-[12px] font-medium text-[#111827]">
                        {isNewGroup ? row.callType : ""}
                      </td>
                      <td className="py-2 pr-3 text-[12px] text-[#344054]" title={row.groupLabel}>
                        {row.groupLabel}
                      </td>
                      {row.cells.map((cell) => (
                        <td key={cell.bucket} className="py-2 pr-3 text-right text-[12px] tabular-nums text-[#344054]">
                          {cell.count}
                          <span className="ml-1 text-[10px] text-[#98A2B3]">({cell.pct}%)</span>
                        </td>
                      ))}
                      <td className="py-2 text-right text-[12px] font-semibold tabular-nums text-[#111827]">
                        {row.total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
