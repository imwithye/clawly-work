export function FieldLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs text-muted uppercase tracking-wider mb-1.5"
    >
      {children}
    </label>
  );
}

export const inputStyles =
  "w-full px-3 py-2 text-sm bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors";
