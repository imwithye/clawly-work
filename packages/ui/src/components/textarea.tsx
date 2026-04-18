import type { TextareaHTMLAttributes } from "react";
import { FieldLabel, inputStyles } from "./field-label";

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
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <textarea
        id={id}
        className={`${inputStyles} resize-y min-h-[80px] ${className}`}
        {...props}
      />
    </div>
  );
}
