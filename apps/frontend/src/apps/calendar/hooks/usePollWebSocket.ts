import { useEffect, useRef, useState } from 'react';

// Define the shape of the data we expect (Generic or specific)
// Using any or unknown for flexibility, or we can use the Poll type if we import it.
// For now, let's keep it generic for the callback.

export const usePollWebSocket = <T>(
    pollId: string | number | undefined,
    onUpdate: (data: T) => void,
    onOpen?: () => void,
    onClose?: () => void
) => {
    const wsRef = useRef<WebSocket | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);

    useEffect(() => {
        if (!pollId) return;

        // Construct WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use VITE_WS_URL if available, otherwise fallback to current host
        const wsBaseUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`;
        const wsUrl = `${wsBaseUrl}/ws/polls/${pollId}`;

        if (import.meta.env.DEV) {
            console.log(`Connecting to WebSocket: ${wsUrl} (Attempt ${reconnectAttempt})`);
        }
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            if (import.meta.env.DEV) console.log('WebSocket connected');
            setReconnectAttempt(0); // Reset reconnect attempts on successful connection
            onOpen?.();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onUpdate(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = (event) => {
            if (import.meta.env.DEV) console.log('WebSocket connection closed:', event.reason);
            onClose?.();

            // Attempt to reconnect if not closed cleanly (or always, depending on requirement)
            // Code 1000 is normal closure. 
            if (event.code !== 1000) {
                const delay = Math.min(1000 * (2 ** reconnectAttempt), 30000); // Exponential backoff max 30s
                if (import.meta.env.DEV) console.log(`Reconnecting in ${delay}ms...`);
                timeoutRef.current = setTimeout(() => {
                    setReconnectAttempt((prev: number) => prev + 1);
                }, delay);
            }
        };

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, "Component unmounting"); // Close cleanly
            }
            wsRef.current = null;
        };
    }, [pollId, onUpdate, onOpen, reconnectAttempt]);
};
