import { RecordsView } from "@/components/records-view";

export default function SalesComplaintReport() {
  return (
    <RecordsView
      dataset="sales_data"
      title="Sales vs Complaint"
      description="Uploaded sales data by product, category and region. Search or filter across all fields."
      fields={["search", "servicePartner", "category", "product", "state"]}
      searchPlaceholder="Search sales by product, category, region…"
    />
  );
}
