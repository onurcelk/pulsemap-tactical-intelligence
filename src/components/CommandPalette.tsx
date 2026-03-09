import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import {
    Search,
    Map,
    Settings,
    Moon,
    Sun,
    Terminal,
    LayoutPanelLeft,
    Globe,
    Zap,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandPaletteProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    actions: {
        toggleTheme: () => void;
        toggleDashboard: () => void;
        toggleActivityLog: () => void;
        toggleHeatmap: () => void;
        toggleStrategic: () => void;
        setRegion: (id: string) => void;
    };
}

export default function CommandPalette({ isOpen, setIsOpen, actions }: CommandPaletteProps) {
    const [search, setSearch] = useState('');

    // Toggle on Cmd+K or Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [isOpen, setIsOpen]);

    const runCommand = (command: () => void) => {
        command();
        setIsOpen(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <Command.Dialog
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    className="fixed inset-0 z-[10000] flex items-start justify-center pt-[20vh] px-4 bg-black/60 backdrop-blur-sm"
                    label="Global Command Palette"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="w-full max-w-2xl bg-[var(--bg)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden glass"
                    >
                        <div className="flex items-center border-b border-[var(--line)] px-4 py-3 gap-3 bg-black/20">
                            <Search size={20} className="text-[var(--accent)] opacity-60" />
                            <Command.Input
                                placeholder="Search commands, regions, or tactical tools..."
                                className="w-full bg-transparent border-none outline-none text-sm font-medium tracking-wide placeholder:opacity-40"
                                value={search}
                                onValueChange={setSearch}
                            />
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--line)]/50 text-[9px] font-black uppercase opacity-40">
                                <span>ESC</span>
                            </div>
                        </div>

                        <Command.List className="max-h-[350px] overflow-y-auto p-2">
                            <Command.Empty className="py-8 text-center text-xs opacity-40 font-mono tracking-widest uppercase">
                                No tactical matches found.
                            </Command.Empty>

                            <Command.Group heading="Tactical Regions" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-3 py-2 mt-2">
                                <CommandItem onSelect={() => runCommand(() => actions.setRegion('middle-east'))} icon={Globe} label="Middle East Ops" />
                                <CommandItem onSelect={() => runCommand(() => actions.setRegion('europe'))} icon={Map} label="Europe / Western Front" />
                                <CommandItem onSelect={() => runCommand(() => actions.setRegion('asia'))} icon={Zap} label="Asia-Pacific Hub" />
                            </Command.Group>

                            <Command.Group heading="Tactical Layers" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-3 py-2 mt-4">
                                <CommandItem onSelect={() => runCommand(actions.toggleStrategic)} icon={Globe} label="Strategic Assets Layer" shortcut="S" />
                                <CommandItem onSelect={() => runCommand(actions.toggleHeatmap)} icon={Zap} label="Pulse Intensity Heatmap" shortcut="H" />
                            </Command.Group>

                            <Command.Group heading="System Controls" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-3 py-2 mt-4">
                                <CommandItem onSelect={() => runCommand(actions.toggleDashboard)} icon={LayoutPanelLeft} label="Open Strategic Dashboard" shortcut="D" />
                                <CommandItem onSelect={() => runCommand(actions.toggleActivityLog)} icon={Terminal} label="Launch System Console" shortcut="L" />
                                <CommandItem onSelect={() => runCommand(actions.toggleTheme)} icon={Moon} label="Switch Tactical Theme" shortcut="T" />
                            </Command.Group>

                            <Command.Group heading="Quick Actions" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-3 py-2 mt-4">
                                <CommandItem onSelect={() => runCommand(() => window.location.reload())} icon={Activity} label="Emergency Reboot System" />
                            </Command.Group>
                        </Command.List>

                        <div className="border-t border-[var(--line)] bg-black/20 px-4 py-3 flex items-center justify-between opacity-40">
                            <span className="text-[9px] font-mono tracking-widest uppercase">PulseMap Tactical Command Palette 2.0</span>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5"><span className="px-1 py-0.5 rounded bg-[var(--line)] text-[8px] font-mono">↑↓</span> <span className="text-[8px] font-mono">NAVIGATE</span></div>
                                <div className="flex items-center gap-1.5"><span className="px-1 py-0.5 rounded bg-[var(--line)] text-[8px] font-mono">↵</span> <span className="text-[8px] font-mono">SELECT</span></div>
                            </div>
                        </div>
                    </motion.div>
                </Command.Dialog>
            )}
        </AnimatePresence>
    );
}

function CommandItem({ icon: Icon, label, onSelect, shortcut }: { icon: any, label: string, onSelect: () => void, shortcut?: string }) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-[var(--line)] aria-selected:text-[var(--ink)] transition-colors group"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--line)]/50 group-aria-selected:bg-[var(--accent)]/10 text-[var(--ink-dim)] group-aria-selected:text-[var(--accent)] transition-all">
                    <Icon size={16} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            {shortcut && (
                <div className="px-2 py-1 rounded bg-[var(--line)]/50 text-[9px] font-black uppercase opacity-20 group-aria-selected:opacity-60 transition-opacity">
                    {shortcut}
                </div>
            )}
        </Command.Item>
    );
}
