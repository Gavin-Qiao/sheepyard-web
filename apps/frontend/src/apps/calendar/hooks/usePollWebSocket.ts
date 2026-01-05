import { useEffect, useRef } from 'react';

// Define the shape of the data we expect (Generic or specific)
// Using any or unknown for flexibility, or we can use the Poll type if we import it.
// For now, let's keep it generic for the callback.

export const usePollWebSocket = <T>(
    pollId: string | number | undefined,
    onUpdate: (data: T) => void,
    onOpen?: () => void
) => {
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!pollId) return;

        // Construct WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use VITE_WS_URL if available, otherwise fallback to current host
        const wsBaseUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`;
        const wsUrl = `${wsBaseUrl}/ws/polls/${pollId}`;

        if (import.meta.env.DEV) {
            console.log(`Connecting to WebSocket: ${wsUrl}`);
        }
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            if (import.meta.env.DEV) console.log('WebSocket connected');
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
        };

        // Cleanup
        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            wsRef.current = null;
        };
    }, [pollId, onUpdate, onOpen]); // Re-run if pollId changes
};
