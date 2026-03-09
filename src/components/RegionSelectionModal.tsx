import { motion, AnimatePresence } from 'motion/react';
import { Globe, MapPin, ChevronRight } from 'lucide-react';
import { Region } from '../types';

interface RegionSelectionModalProps {
  regions: Region[];
  onSelectRegion: (region: Region) => void;
  isOpen: boolean;
}

export default function RegionSelectionModal({
  regions,
  onSelectRegion,
  isOpen,
}: RegionSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-[var(--bg)]/90 backdrop-blur-xl">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-4xl px-6 py-10"
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
              <Globe size={40} className="text-[var(--accent)]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase mb-4 text-[var(--ink)]">
              Select Origin
            </h1>
            <p className="text-[var(--ink-dim)] text-lg max-w-xl mx-auto font-medium">
              Initialize tactical telemetry protocol. Choose a primary geographic zone to begin
              monitoring live conflict events.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regions.map((region, index) => (
              <motion.button
                key={region.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectRegion(region)}
                className="group relative overflow-hidden bg-[var(--line)]/10 border border-[var(--line)]/50 hover:border-[var(--accent)] rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-[var(--accent)]">
                      <MapPin size={18} />
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest opacity-80">
                        Sector {index + 1}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                      {region.name}
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[var(--line)]/20 flex items-center justify-center text-[var(--ink-dim)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all transform group-hover:translate-x-1">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
