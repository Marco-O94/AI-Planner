import { PageHeader } from "@/components/common";

// Placeholder dashboard — replaced by the dashboard feature implementation.
export default function HomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Capture notes, tasks and documents per project and domain, then generate typed artifacts."
      />
      <p className="text-sm text-muted-foreground">Dashboard coming up.</p>
    </div>
  );
}
