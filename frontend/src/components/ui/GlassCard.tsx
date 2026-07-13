"use client";

import React from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export default function GlassCard({ children, className = "", hoverEffect = true }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -5, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)" } : {}}
      className={`bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden ${className}`}
    >
      {/* Subtle top glare effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
