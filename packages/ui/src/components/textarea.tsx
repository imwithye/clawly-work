import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export function Textarea({
  label,
  className = "",
  id,
  ...props
}: TextareaProps) {
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
      <textarea
        id={id}
        className={`w-full px-3 py-2 text-sm bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors resize-y min-h-[80px] ${className}`}
        {...props}
      />
    </div>
  );
}
