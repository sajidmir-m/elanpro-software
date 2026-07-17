import { RecordsView } from "@/components/records-view";

export default function WarrantyReport() {
  return (
    <RecordsView
      dataset="tickets"
      title="Warranty Analysis"
      description="Tickets split by in / out of warranty. Use the warranty filter or search across all fields."
      searchPlaceholder="Search tickets by warranty, product, customer…"
    />
  );
}
