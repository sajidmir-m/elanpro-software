import { AlertCircle } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-56 border border-dashed rounded-xl bg-card/40 px-6 text-center">
      <AlertCircle className="size-8 text-muted-foreground mb-3" />
      <h3 className="font-medium">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
    </div>
  );
}
