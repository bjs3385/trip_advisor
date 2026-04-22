"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, ShieldAlert, Zap } from "lucide-react";
import { useTripStore } from "@/store/useTripStore";
import { cn } from "@/lib/utils";

export function MissionOverlay() {
  const { isMissionActive, setMissionActive } = useTripStore();

  return (
    <AnimatePresence>
      {!isMissionActive && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl crt-overlay crt-flicker"
        >
          {/* Background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative flex flex-col items-center max-w-md w-full p-8 border border-white/10 bg-surface/50 shadow-2xl rounded-sm"
          >
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-blue-500" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-blue-500" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-blue-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-blue-500" />

            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)] relative">
              <ShieldAlert className="w-8 h-8 text-blue-400" />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border border-blue-400"
              />
            </div>

            <h1 className="text-2xl font-bold text-white tracking-[0.2em] uppercase mb-2 text-center shadow-blue-500/50 drop-shadow-md">
              Operation <br /> Pine Mountain
            </h1>

            <p className="text-xs font-mono text-blue-400/80 tracking-widest uppercase mb-8 text-center">
              System Authorization Required
            </p>

            <div className="w-full space-y-3 mb-8">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 border-b border-white/5 pb-2">
                <span>TARGET</span>
                <span className="text-white">YOSEMITE NATIONAL PARK</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 border-b border-white/5 pb-2">
                <span>UNITS</span>
                <span className="text-white">3 FAMILIES</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 border-b border-white/5 pb-2">
                <span>STATUS</span>
                <span className="text-emerald-400 animate-pulse">READY FOR DEPLOYMENT</span>
              </div>
            </div>

            <button
              onClick={() => setMissionActive(true)}
              className="relative group w-full py-4 bg-blue-500/10 border border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-400 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-400/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <div className="relative flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
                <span className="text-sm font-bold font-mono text-blue-400 group-hover:text-white tracking-widest uppercase transition-colors">
                  Initiate Launch
                </span>
              </div>
            </button>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
