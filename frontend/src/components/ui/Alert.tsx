import React from "react";
import { cn } from "../../lib/utils";
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "destructive";
  title?: string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, children, ...props }, ref) => {
    const icons = {
      info: <Info className="h-5 w-5 text-indigo-400 shrink-0" />,
      success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
      warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
      destructive: <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />,
    };

    const variants = {
      info: "bg-indigo-500/10 border-indigo-500/20 text-indigo-200",
      success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
      warning: "bg-amber-500/10 border-amber-500/20 text-amber-200",
      destructive: "bg-red-500/10 border-red-500/20 text-red-200",
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-xl border p-4 flex gap-3 text-sm transition-all",
          variants[variant],
          className
        )}
        {...props}
      >
        {icons[variant]}
        <div className="flex-1">
          {title && <h5 className="font-semibold leading-none tracking-tight mb-1 text-white">{title}</h5>}
          <div className="text-xs opacity-90 leading-relaxed">{children}</div>
        </div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export { Alert };
