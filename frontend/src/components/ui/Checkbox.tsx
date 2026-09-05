import React from "react";
import { cn } from "../../lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className={cn(
          "h-4 w-4 rounded border-zinc-700 bg-zinc-900/50 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
