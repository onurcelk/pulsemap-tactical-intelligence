import { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Terminal, Shield, Zap, Info, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { FixedSizeList } from 'react-window';
const List = FixedSizeList;
import { useActivityStore } from '../store/activityStore';
import { ActivityLog } from '../types';

interface GlobalActivityLogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GlobalActivityLog({ isOpen, onClose }: GlobalActivityLogProps) {
    const { logs, clearLogs } = useActivityStore();
    const listRef = useRef<FixedSizeList>(null);

    const getIcon = (category: ActivityLog['category']) => {
        switch (category) {
            case 'system': return <Database size={14} className="text-zinc-400" />;
            case 'auth': return <Shield size={14} className="text-blue-400" />;
            case 'map': return <Activity size={14} className="text-emerald-400" />;
            case 'radar': return <Zap size={14} className="text-yellow-400" />;
            case 'collaboration': return <Terminal size={14} className="text-purple-400" />;
            case 'ai': return <Zap size={14} className="text-cyan-400" />;
            default: return <Info size={14} className="text-zinc-400" />;
        }
    };

    const getTypeColor = (type: ActivityLog['type']) => {
        switch (type) {
            case 'info': return 'text-zinc-300';
            case 'warning': return 'text-amber-400';
            case 'error': return 'text-red-400';
            case 'success': return 'text-emerald-400';
            default: return 'text-zinc-300';
        }
    };

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const log = logs[index];
        if (!log) return null;

        return (
            <div style={style} className="px-4 py-2 border-b border-[var(--line)]/30 hover:bg-[var(--line)]/10 transition-colors flex flex-col justify-center">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        {getIcon(log.category)}
                        <span className={`text-[10px] font-mono tracking-widest uppercase opacity-40 font-bold`}>
                            {log.category}
                        </span>
                    </div>
                    <span className="text-[9px] font-mono opacity-20">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
                <div className={`text-xs font-mono tracking-tight leading-relaxed ${getTypeColor(log.type)}`}>
                    <span className="opacity-40 mr-1.5">$</span>
                    {log.message}
                </div>
                {log.user && (
                    <div className="mt-1 flex items-center gap-1.5 opacity-20">
                        <div className="w-2 h-[1px] bg-zinc-500" />
                        <span className="text-[8px] font-mono uppercase tracking-widest">{log.user}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="fixed top-0 right-0 h-full w-full max-w-[450px] bg-[var(--bg)] border-l border-[var(--line)] shadow-2xl z-[1001] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--line)] bg-[var(--bg)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                    <Terminal size={20} className="text-zinc-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-100">Global Activity Log</h2>
                                    <p className="text-[9px] font-mono uppercase opacity-30 tracking-widest">Sector Audit Trail // Decrypted</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearLogs}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors"
                                >
                                    Clear Console
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 bg-black/20">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-8">
                                    <Terminal size={48} className="mb-4" />
                                    <p className="text-xs font-mono uppercase tracking-widest">No terminal output detected.</p>
                                    <p className="text-[10px] font-mono mt-1">Waiting for system telemetry...</p>
                                </div>
                            ) : (
                                <List
                                    ref={listRef}
                                    height={800} // This will be constrained by flex-1 parent
                                    itemCount={logs.length}
                                    itemSize={76}
                                    width="100%"
                                    className="scrollbar-thin"
                                >
                                    {Row}
                                </List>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-[var(--line)] bg-[var(--bg)]/50 flex items-center justify-between text-[9px] font-mono opacity-20">
                            <span className="uppercase tracking-widest">System Status: Nominal</span>
                            <span className="uppercase tracking-widest">{logs.length} Logs Buffered</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
