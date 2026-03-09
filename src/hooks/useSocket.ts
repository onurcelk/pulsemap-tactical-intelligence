import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3000');

export function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);

    useEffect(() => {
        const socketInstance = io(SOCKET_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: true,
        });

        socketInstance.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to Live Feed WebSocket');
        });

        socketInstance.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from Live Feed WebSocket');
        });

        socketInstance.on('new_threat_event', (data) => {
            setLastMessage(data);
        });

        socketRef.current = socketInstance;

        return () => {
            socketInstance.disconnect();
            socketRef.current = null;
        };
    }, []);

    const emitEvent = useCallback((eventName: string, data: any) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit(eventName, data);
        }
    }, [isConnected]);

    return { isConnected, lastMessage, emitEvent };
}
