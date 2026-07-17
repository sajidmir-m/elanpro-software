import { RecordsView } from "@/components/records-view";

export default function ProductFailureReport() {
  return (
    <RecordsView
      dataset="tickets"
      title="Product Failure"
      description="All tickets by product & category. Filter or search to isolate failing products."
      searchPlaceholder="Search by product, category, ticket, customer…"
    />
  );
}
