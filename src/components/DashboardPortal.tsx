import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
// @ts-ignore
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { motion, AnimatePresence } from 'motion/react';
import { X, GripHorizontal, Maximize2, Minimize2, LayoutPanelLeft } from 'lucide-react';
import { DashboardWidget, DashboardLayout } from '../types';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface DashboardPortalProps {
    isOpen: boolean;
    onClose: () => void;
    // Widgets mapping
    widgets: {
        id: string;
        title: string;
        component: React.ReactNode;
        defaultLayout: { x: number; y: number; w: number; h: number; minW?: number; minH?: number };
    }[];
}

const DEFAULT_LAYOUTS = {
    lg: [
        { i: 'timeline', x: 0, y: 10, w: 6, h: 4 },
        { i: 'risk', x: 6, y: 10, w: 6, h: 4 },
        { i: 'intel', x: 8, y: 0, w: 4, h: 10 },
    ],
};

export default function DashboardPortal({ isOpen, onClose, widgets }: DashboardPortalProps) {
    const { width, containerRef, mounted } = useContainerWidth();
    const [layouts, setLayouts] = useState<any>(() => {
        const saved = localStorage.getItem('pulsemap_dashboard_layout');
        return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS;
    });

    const onLayoutChange = (currentLayout: any, allLayouts: any) => {
        setLayouts(allLayouts);
        localStorage.setItem('pulsemap_dashboard_layout', JSON.stringify(allLayouts));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-md overflow-y-auto pt-16 pb-8 px-4 md:px-8">
            <div className="max-w-[1600px] mx-auto" ref={containerRef}>
                <header className="flex items-center justify-between mb-8 px-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-xl shadow-red-500/20">
                            <LayoutPanelLeft className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-widest text-white">Strategic Dashboard</h1>
                            <p className="text-xs font-mono uppercase opacity-40 tracking-widest">Personal Command Center // Real-time Feed</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/60 hover:text-white"
                    >
                        <X size={28} />
                    </button>
                </header>

                {mounted && (
                    <ResponsiveGridLayout
                        className="layout"
                        layouts={layouts}
                        width={width}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={100}
                        draggableHandle=".widget-drag-handle"
                        onLayoutChange={onLayoutChange}
                    >
                        {widgets.map((w) => (
                            <div key={w.id} className="bg-[var(--bg)]/80 backdrop-blur-xl border border-[var(--line)] rounded-3xl overflow-hidden flex flex-col shadow-2xl group">
                                <div className="widget-drag-handle px-5 py-3 border-b border-[var(--line)] flex items-center justify-between cursor-move bg-black/20">
                                    <div className="flex items-center gap-2">
                                        <GripHorizontal size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-white">{w.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white"><Maximize2 size={12} /></button>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 relative overflow-hidden">
                                    {w.component}
                                </div>
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                )}
            </div>
        </div>
    );
}
