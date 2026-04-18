import { Icon } from "@iconify/react";

export function StatCard({
  label,
  value,
  icon,
  iconColor = "text-accent",
}: {
  label: string;
  value: number | string;
  icon: string;
  iconColor?: string;
}) {
  return (
    <div className="border border-border p-4 flex items-start gap-3">
      <Icon icon={icon} width={20} className={iconColor} />
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-xl font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
