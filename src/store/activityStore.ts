import { create } from 'zustand';
import { ActivityLog } from '../types';

interface ActivityState {
    logs: ActivityLog[];
    addLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
    clearLogs: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
    logs: [],
    addLog: (log) => {
        const newLog: ActivityLog = {
            ...log,
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date().toISOString(),
        };
        set((state) => ({
            logs: [newLog, ...state.logs].slice(0, 1000), // Keep last 1000 logs
        }));
    },
    clearLogs: () => set({ logs: [] }),
}));
