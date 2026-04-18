import type { InputHTMLAttributes } from "react";
import { FieldLabel, inputStyles } from "./field-label";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, className = "", id, ...props }: InputProps) {
  return (
    <div>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <input id={id} className={`${inputStyles} ${className}`} {...props} />
    </div>
  );
}
