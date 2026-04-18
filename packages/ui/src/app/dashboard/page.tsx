import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      description="Overview of your Clawly instance."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Agents"
          value={3}
          icon="solar:bot-linear"
          iconColor="text-accent"
        />
        <StatCard
          label="Running Tasks"
          value={1}
          icon="solar:play-circle-linear"
          iconColor="text-success"
        />
        <StatCard
          label="API Keys"
          value={2}
          icon="solar:key-linear"
          iconColor="text-warning"
        />
        <StatCard
          label="Failed Tasks"
          value={0}
          icon="solar:danger-triangle-linear"
          iconColor="text-danger"
        />
      </div>
    </PageShell>
  );
}
