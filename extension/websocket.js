import { Logger } from './logger.js';

const logger = new Logger('websocket.js');

export function setupWebSocket() {
    const ws = new WebSocket('ws://localhost:5000/ws');

    ws.onopen = () => {
        logger.info('WebSocket connection established');
    };

    ws.onmessage = (message) => {
        logger.info('Message from server:', message.data);
        const data = JSON.parse(message.data);
        logger.debug('Data:', data);

        // TODO: Procesar el mensaje recibido
    };

    ws.onclose = () => {
        logger.info('WebSocket connection closed. Reconnecting...');
        setTimeout(setupWebSocket, 5000); // Intentar reconectar
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    return ws;
}

export function notifyServer(ws, type, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, message }));
    } else {
        logger.warn(
            'Could not send message to server, WebSocket is not connected'
        );
    }
}
