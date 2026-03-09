import { useState } from 'react';
import { FileText, FileSpreadsheet, ChevronDown, Lock, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToCSV, exportToPDF } from '../lib/exportUtils';
import { MapEvent } from '../types';
import { User } from '@supabase/supabase-js';

interface ExportMenuProps {
    events: MapEvent[];
    mapElementId?: string;
    user?: User | null;
    onAuthRequired?: () => void;
}

export default function ExportMenu({ events, mapElementId = 'app-map-area', user, onAuthRequired }: ExportMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportCSV = () => {
        exportToCSV(events);
        setIsOpen(false);
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await exportToPDF(events, mapElementId);
        } catch (err) {
            console.error('PDF Export failed', err);
        } finally {
            setIsExporting(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative pointer-events-auto">
            <button
                onClick={() => {
                    if (!user) {
                        onAuthRequired?.();
                    } else {
                        setIsOpen(!isOpen);
                    }
                }}
                className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl px-3 py-2.5 flex items-center gap-2 shadow-2xl hover:bg-[var(--line)] transition-all text-xs font-black uppercase tracking-widest group"
                title={!user ? "Authentication Required" : "Export Data"}
            >
                {!user ? <Lock size={12} className="text-red-400" /> : <Download size={14} className="text-[var(--accent)]" />}
                <span className="hidden sm:inline">Export</span>
                {user && <ChevronDown size={12} className={`transition-transform opacity-50 ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 w-48 glass bg-[var(--bg)]/90 rounded-2xl border border-[var(--glass-border)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[9900]"
                    >
                        <div className="p-1.5 flex flex-col gap-1">
                            <button
                                onClick={handleExportCSV}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--line)] transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                            >
                                <FileSpreadsheet size={14} className="text-emerald-400" />
                                Raw Data (CSV)
                            </button>
                            <button
                                disabled={isExporting}
                                onClick={handleExportPDF}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--line)] transition-all text-[10px] font-bold uppercase tracking-wider relative group overflow-hidden disabled:opacity-50"
                            >
                                {isExporting ? <span className="absolute inset-x-0 h-0.5 bottom-0 bg-[var(--accent)] animate-pulse" /> : null}
                                <FileText size={14} className="text-red-400" />
                                <span className="flex-1 text-left">{isExporting ? 'Generating...' : 'Briefing (PDF)'}</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
