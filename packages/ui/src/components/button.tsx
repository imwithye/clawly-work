import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "text-accent hover:bg-accent/15",
  ghost: "text-muted hover:text-accent hover:bg-accent/10",
  danger: "text-muted hover:text-danger hover:bg-danger/10",
  outline:
    "border border-border text-muted hover:text-foreground hover:border-foreground/30",
  solid: "bg-foreground text-background hover:opacity-90",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-sm transition-all disabled:opacity-40 cursor-pointer ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
