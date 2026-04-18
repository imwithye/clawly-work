import type { SelectHTMLAttributes } from "react";

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
      {label && (
        <label
          htmlFor={id}
          className="block text-xs text-muted uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full px-3 py-2 pr-8 text-sm bg-background border border-border text-foreground appearance-none focus:outline-none focus:border-accent transition-colors bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22%23737373%22%20d%3D%22m12%2015.4l-6-6L7.4%208l4.6%204.6L16.6%208L18%209.4z%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_8px_center] bg-no-repeat ${className}`}
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
