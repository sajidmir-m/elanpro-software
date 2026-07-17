import { Card, CardContent } from "@/components/ui/card";

export type KpiItem = {
  label: string;
  value: string | number;
  hint?: string;
};

export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="border-border/80">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              {item.label}
            </p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{item.value}</p>
            {item.hint && <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
