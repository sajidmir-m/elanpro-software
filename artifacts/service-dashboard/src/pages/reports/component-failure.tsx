import { RecordsView } from "@/components/records-view";

export default function ComponentFailureReport() {
  return (
    <RecordsView
      dataset="component_consumption"
      title="Parts & Consumption"
      description="Components organized by family, model and part code, with total consumption for each product."
      fields={[
        "search",
        "componentCategory",
        "servicePartner",
        "ash",
        "category",
        "product",
        "state",
      ]}
      searchPlaceholder="Search component, model, part code or product…"
      defaultSortBy="component_category"
    />
  );
}
