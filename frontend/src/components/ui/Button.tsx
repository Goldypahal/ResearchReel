"use client";

import React, { useRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import gsap from "gsap";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  onClick,
  ...props
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    if (buttonRef.current) {
      gsap.to(buttonRef.current, { scale: 1.05, duration: 0.3, ease: "power2.out" });
    }
  };

  const handleMouseLeave = () => {
    if (buttonRef.current) {
      gsap.to(buttonRef.current, { scale: 1, duration: 0.3, ease: "power2.out" });
    }
  };

  const baseStyles = "relative overflow-hidden font-semibold rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]",
    secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/5 focus:ring-white/20",
    outline: "bg-transparent text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500/10 focus:ring-indigo-500",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5 focus:ring-white/10"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
