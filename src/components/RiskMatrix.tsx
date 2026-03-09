import React, { useMemo } from 'react';
import { MapEvent } from '../types';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { calculateThreatScore } from '../lib/anomalyScore';

interface RiskMatrixProps {
  events: MapEvent[];
}

export default function RiskMatrix({ events }: RiskMatrixProps) {
  const matrixData = useMemo(() => {
    // 3x3 Matrix: Impact (Y) vs Likelihood (X)
    const grid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => [] as MapEvent[]));

    events.forEach(event => {
      // Simplify into grid coordinates
      let x = Math.min(2, Math.floor((event.hotScore || 1) / 1.5)); // Likelihood
      let y = 0; // Impact
      if (['military', 'explosion'].includes(event.category)) y = 2;
      else if (['protest', 'humanitarian'].includes(event.category)) y = 1;

      grid[y][x].push(event);
    });

    return grid;
  }, [events]);

  const cells = [
    { label: 'Low', color: 'bg-emerald-500' },
    { label: 'Med', color: 'bg-yellow-500' },
    { label: 'High', color: 'bg-orange-500' },
    { label: 'Critical', color: 'bg-red-500' },
  ];

  return (
    <div className="w-full h-full p-6 flex flex-col bg-black/40 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-red-500" size={18} />
          <h2 className="text-xs font-black uppercase tracking-widest text-white/80">Tactical Risk Matrix</h2>
        </div>
        <span className="text-[10px] font-mono opacity-30 uppercase tracking-[0.2em]">{events.length} SIGNALS ANALYZED</span>
      </div>

      <div className="flex-1 min-h-[300px] grid grid-cols-3 grid-rows-3 gap-2 relative mb-4">
        <div className="absolute -left-10 top-1/2 -rotate-90 text-[8px] font-mono uppercase tracking-[0.3em] opacity-20">Impact Level</div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono uppercase tracking-[0.3em] opacity-20">Likelihood</div>

        {[...matrixData].reverse().map((row, yIdx) => {
          const y = 2 - yIdx;
          return row.map((cellEvents, x) => {
            const severityIdx = x + y;
            const intensity = cellEvents.length > 0 ? Math.min(1, 0.1 + cellEvents.length * 0.2) : 0;

            return (
              <div
                key={`${y}-${x}`}
                className={`border border-white/5 rounded-xl flex items-center justify-center relative group transition-all ${cellEvents.length > 0 ? 'bg-white/5' : ''}`}
              >
                {cellEvents.length > 0 && (
                  <div
                    className={`absolute inset-1 rounded-lg transition-opacity duration-1000 ${severityIdx > 3 ? 'bg-red-500/20' : severityIdx > 1 ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}
                    style={{ opacity: intensity }}
                  />
                )}
                <span className={`text-[10px] font-mono font-bold ${cellEvents.length > 0 ? 'opacity-100' : 'opacity-10'}`}>
                  {cellEvents.length}
                </span>
              </div>
            );
          });
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex gap-4">
          {cells.map(c => (
            <div key={c.label} className="flex items-center gap-1.5 leading-none">
              <div className={`w-2 h-2 rounded-full ${c.color}`} />
              <span className="text-[8px] font-mono uppercase opacity-40">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
