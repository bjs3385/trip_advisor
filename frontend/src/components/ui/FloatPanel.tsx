"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatPanelProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FloatPanel({ children, className = "", delay = 0 }: FloatPanelProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ layout: { duration: 0.25, ease: "easeInOut" }, duration: 0.4, delay, ease: "easeOut" }}
      className={cn(
        "bg-surface/80 backdrop-blur-md border border-border-dim/80 rounded-sm shadow-2xl relative overflow-hidden",
        "before:absolute before:inset-0 before:border before:border-white/5 before:pointer-events-none before:rounded-sm",
        className
      )}
    >
      {/* Palantir-style corner accents */}
      <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-white/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-white/30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-white/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-white/30 pointer-events-none" />
      {children}
    </motion.div>
  );
}
