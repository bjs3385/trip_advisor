import { MapPin } from "lucide-react";

export function MapPlaceholder() {
  return (
    <div className="w-full h-full bg-[#06090e] flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full border border-blue-500/10" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-blue-400/20" />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-blue-300/30" />
      </div>

      <div className="relative flex flex-col items-center gap-4 p-6 bg-black/40 border border-white/10 rounded-sm backdrop-blur-md">
        <MapPin className="w-8 h-8 text-blue-500 animate-pulse" />
        <div className="text-center">
          <p className="text-blue-400 text-[13px] font-bold tracking-[0.2em] uppercase mb-1">
            Map Render Engine Offline
          </p>
          <p className="text-slate-500 text-[10px] font-mono tracking-widest">
            AWAITING NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
        </div>
      </div>
    </div>
  );
}
