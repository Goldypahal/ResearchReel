import React from "react";
import { cn } from "../../lib/utils";

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

export function Select({
  children,
  value,
  onValueChange,
  disabled,
  className
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const options: { value: string; label: string }[] = [];
  let placeholder = "Select...";

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const childElement = child as React.ReactElement<{ value?: string; children?: React.ReactNode; placeholder?: string }>;
      if (childElement.type === SelectItem) {
        options.push({
          value: childElement.props.value || "",
          label: String(childElement.props.children || "")
        });
      } else if (childElement.type === SelectValue) {
        placeholder = childElement.props.placeholder || placeholder;
      } else if (childElement.props.children) {
        React.Children.forEach(childElement.props.children, (nestedChild) => {
          if (React.isValidElement(nestedChild)) {
            const nestedChildElement = nestedChild as React.ReactElement<{ value?: string; children?: React.ReactNode }>;
            if (nestedChildElement.type === SelectItem) {
              options.push({
                value: nestedChildElement.props.value || "",
                label: String(nestedChildElement.props.children || "")
              });
            }
          }
        });
      }
    }
  });

  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer",
        className
      )}
    >
      {placeholder && <option value="" disabled className="bg-zinc-900 text-zinc-500">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function SelectTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  void placeholder;
  return null;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: SelectItemProps) {
  void value;
  void children;
  return null;
}
