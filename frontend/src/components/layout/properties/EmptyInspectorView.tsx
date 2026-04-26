import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

export function EmptyInspectorView() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full py-6 gap-3 opacity-50"
    >
      <div className="p-2 border border-slate-700 rounded-sm">
        <MapPin className="w-4 h-4 text-slate-500" />
      </div>
      <p className="text-[10px] font-mono text-slate-500 text-center leading-loose tracking-widest">
        AWAITING
        <br />
        TARGET SELECTION
      </p>
    </motion.div>
  );
}
