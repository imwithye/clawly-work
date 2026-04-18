import type { SelectHTMLAttributes } from "react";
import { FieldLabel, inputStyles } from "./field-label";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
};

export function Select({
  label,
  options,
  className = "",
  id,
  ...props
}: SelectProps) {
  return (
    <div>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <select
        id={id}
        className={`${inputStyles} pr-8 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23737373%22%20d%3D%22m12%2015.4l-6-6L7.4%208l4.6%204.6L16.6%208L18%209.4z%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_8px_center] bg-no-repeat ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
