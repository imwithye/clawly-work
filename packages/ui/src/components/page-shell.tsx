import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <div>
        <h1 className="text-lg text-accent">{title}</h1>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
