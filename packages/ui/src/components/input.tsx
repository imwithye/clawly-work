import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, className = "", id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs text-muted uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2 text-sm bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
