import { RecordsView } from "@/components/records-view";

export default function TatReport() {
  return (
    <RecordsView
      dataset="closed_tickets"
      title="TAT Deep-dive"
      description="Closed tickets with turnaround time. Sort by TAT or search across every field."
      searchPlaceholder="Search closed tickets, customers, partners…"
    />
  );
}
