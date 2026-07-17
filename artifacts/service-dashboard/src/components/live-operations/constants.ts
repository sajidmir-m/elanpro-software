export const OPS_COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E5E7EB",
  primary: "#2563EB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  text: "#0F172A",
  muted: "#64748B",
};

export const OPS_CARD =
  "rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-250 ease-out hover:-translate-y-0.5";

export const OPS_HOVER = "transition-all duration-250 ease-out hover:-translate-y-0.5";

export const HEALTH_STYLES: Record<string, string> = {
  Excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Good: "bg-slate-100 text-slate-700 border-slate-200",
  Watch: "bg-amber-50 text-amber-700 border-amber-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
};

export const HEALTH_DOT: Record<string, string> = {
  Excellent: "bg-[#16A34A]",
  Good: "bg-slate-400",
  Watch: "bg-[#F59E0B]",
  Critical: "bg-[#DC2626]",
};

export const KPI_STATUS_DOT: Record<string, string> = {
  healthy: "bg-[#16A34A]",
  warning: "bg-[#F59E0B]",
  critical: "bg-[#DC2626]",
};
