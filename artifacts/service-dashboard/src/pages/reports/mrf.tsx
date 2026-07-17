import { RecordsView } from "@/components/records-view";

export default function MrfReport() {
  return (
    <RecordsView
      dataset="mrf_data"
      title="Parts & MRF"
      description="Material Requisition Form records. Filter by partner/ASH/product or search across all fields."
      fields={["search", "servicePartner", "ash", "category", "product", "state"]}
      searchPlaceholder="Search by component, part code, MRF, ticket…"
    />
  );
}
