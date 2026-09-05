"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link" | "gradient";
  size?: "default" | "sm" | "md" | "lg" | "icon";
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";
    
    const variants = {
      default: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]",
      primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]",
      secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/5",
      outline: "border border-zinc-700 bg-transparent hover:bg-white/5 text-white",
      ghost: "hover:bg-white/5 text-zinc-400 hover:text-white",
      destructive: "bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]",
      link: "text-indigo-400 underline-offset-4 hover:underline bg-transparent hover:bg-transparent",
      gradient: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.02] shadow-[0_0_20px_rgba(99,102,241,0.4)]"
    };
    
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      md: "h-10 px-4 py-2",
      lg: "h-11 rounded-md px-8 text-base",
      icon: "h-10 w-10",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export default Button;
