import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapEvent } from '../types';
import { motion } from 'motion/react';
import { Clock, Lock } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface TimelineViewProps {
    events: MapEvent[];
    selectedRange?: [Date, Date] | null;
    onRangeSelect?: (range: [Date, Date] | null) => void;
    user?: User | null;
    onAuthRequired?: () => void;
    isWidget?: boolean;
}

export default React.memo(function TimelineView({
    events,
    selectedRange,
    onRangeSelect,
    user,
    onAuthRequired,
    isWidget
}: TimelineViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubStart, setScrubStart] = useState<number | null>(null);
    const [scrubEnd, setScrubEnd] = useState<number | null>(null);

    // Determine global time boundaries based on events
    const { minTime, maxTime, histogram } = useMemo(() => {
        if (events.length === 0) return { minTime: Date.now() - 86400000, maxTime: Date.now(), histogram: [] };

        let min = Infinity;
        let max = -Infinity;
        events.forEach(e => {
            const t = new Date(e.timestamp).getTime();
            if (t < min) min = t;
            if (t > max) max = t;
        });

        // Add padding (5% on each side)
        const padding = (max - min) * 0.05;
        min = min - padding;
        max = max + padding;

        // Create 100 buckets for the histogram
        const numBuckets = 100;
        const bucketSize = (max - min) / numBuckets;
        const buckets = new Array(numBuckets).fill(0);

        events.forEach(e => {
            const t = new Date(e.timestamp).getTime();
            const bucketIdx = Math.min(numBuckets - 1, Math.max(0, Math.floor((t - min) / bucketSize)));
            buckets[bucketIdx]++;
        });

        const maxCount = Math.max(...buckets, 1);

        return {
            minTime: min,
            maxTime: max,
            histogram: buckets.map((count, i) => ({
                time: min + i * bucketSize,
                count,
                normalizedHeight: count / maxCount
            }))
        };
    }, [events]);

    // Handle Mouse Events for scrubbing
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!user) {
            onAuthRequired?.();
            return;
        }
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        setScrubStart(percent);
        setScrubEnd(percent);
        setIsScrubbing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isScrubbing || scrubStart === null || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        setScrubEnd(percent);
    };

    const handleMouseUp = () => {
        if (isScrubbing && scrubStart !== null && scrubEnd !== null) {
            const startP = Math.min(scrubStart, scrubEnd);
            const endP = Math.max(scrubStart, scrubEnd);

            const timeSpan = maxTime - minTime;
            const tStart = new Date(minTime + startP * timeSpan);
            const tEnd = new Date(minTime + endP * timeSpan);

            // If click (very small scrub), clear selection
            if (endP - startP < 0.01) {
                onRangeSelect?.(null);
            } else {
                onRangeSelect?.([tStart, tEnd]);
            }
        }
        setIsScrubbing(false);
        setScrubStart(null);
        setScrubEnd(null);
    };

    useEffect(() => {
        if (isScrubbing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isScrubbing, scrubStart, scrubEnd, minTime, maxTime]);

    const displayStart = scrubStart !== null ? Math.min(scrubStart, scrubEnd || scrubStart) :
        (selectedRange ? (selectedRange[0].getTime() - minTime) / (maxTime - minTime) : 0);

    const displayEnd = scrubStart !== null ? Math.max(scrubStart, scrubEnd || scrubStart) :
        (selectedRange ? (selectedRange[1].getTime() - minTime) / (maxTime - minTime) : 1);

    return (
        <div className={isWidget ? "w-full h-full p-4" : "fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[95%] sm:w-[80%] max-w-4xl z-[1400]"}>
            <div className={isWidget ? "h-full flex flex-col" : "glass bg-[var(--bg)]/80 border border-[var(--line)] rounded-2xl p-2 md:p-4 shadow-2xl backdrop-blur-xl"}>
                <div className="flex items-center justify-between mb-2 md:mb-3 px-2">
                    <div className="flex items-center gap-2">
                        {!user ? <Lock size={12} className="text-red-400" /> : <Clock size={14} className="text-[var(--accent)]" />}
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--ink-dim)]">Event Timeline</span>
                    </div>
                    {selectedRange && (
                        <button
                            onClick={() => onRangeSelect?.(null)}
                            className="text-[10px] font-mono tracking-wider uppercase bg-[var(--line)]/50 px-2 py-1 rounded hover:bg-[var(--line)] hover:text-[var(--ink)] transition-colors"
                        >
                            Clear Filter
                        </button>
                    )}
                </div>

                <div
                    ref={containerRef}
                    className={`relative w-full cursor-crosshair rounded-lg overflow-hidden bg-black/20 ${isWidget ? 'flex-1' : 'h-16'}`}
                    onMouseDown={handleMouseDown}
                >
                    {/* Histogram Bars */}
                    <div className="absolute inset-x-0 bottom-0 h-full flex items-end gap-[1px] px-1 pointer-events-none">
                        {histogram.map((bucket, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-[var(--accent)] transition-all duration-300 rounded-t-sm"
                                style={{
                                    height: `${Math.max(2, bucket.normalizedHeight * 100)}%`,
                                    opacity: bucket.count === 0 ? 0.1 : (bucket.normalizedHeight * 0.5 + 0.3)
                                }}
                            />
                        ))}
                    </div>

                    {/* Selection Scrubber Overlay */}
                    {(displayStart !== 0 || displayEnd !== 1) && (
                        <motion.div
                            className="absolute inset-y-0 bg-[var(--accent)]/20 border-x-2 border-[var(--accent)] pointer-events-none"
                            initial={false}
                            animate={{
                                left: `${displayStart * 100}%`,
                                width: `${(displayEnd - displayStart) * 100}%`
                            }}
                            transition={{ type: 'tween', ease: 'easeOut', duration: 0.1 }}
                        >
                            <div className="absolute -top-3 left-0 -translate-x-1/2 text-[7px] md:text-[9px] font-mono whitespace-nowrap bg-[var(--bg)] px-1 rounded border border-[var(--accent)]/30">
                                {new Date(minTime + displayStart * (maxTime - minTime)).toLocaleDateString()}
                            </div>
                            <div className="absolute -top-3 right-0 translate-x-1/2 text-[7px] md:text-[9px] font-mono whitespace-nowrap bg-[var(--bg)] px-1 rounded border border-[var(--accent)]/30">
                                {new Date(minTime + displayEnd * (maxTime - minTime)).toLocaleDateString()}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
