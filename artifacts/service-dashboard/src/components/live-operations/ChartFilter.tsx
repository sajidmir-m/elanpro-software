import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ChartFilterOption = { label: string; value: string };

export function ChartFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ChartFilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#64748B]">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[130px] rounded-lg border-[#E5E7EB] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export const TOP_N_OPTIONS: ChartFilterOption[] = [
  { label: "Top 5", value: "5" },
  { label: "Top 10", value: "10" },
  { label: "Show All", value: "all" },
];

export const STATUS_FILTER_OPTIONS: ChartFilterOption[] = [
  { label: "All Status", value: "all" },
];
