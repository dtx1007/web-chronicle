import { Logger } from './logger.js';

const logger = new Logger('websocket.js');

export function setupWebSocket() {
    const ws = new WebSocket('ws://localhost:5000/ws');

    ws.onopen = () => {
        logger.info('WebSocket connection established');
    };

    ws.onmessage = (message) => {
        logger.info('Message from server:', message.data);

        try {
            const data = JSON.parse(message.data);
            
            // Validar el formato del mensaje (debe ser JSON y tener los campos type y message)
            if (!data.type || !data.hasOwnProperty('message')) {
                logger.error('Invalid message format received:', data);
                return;
            }
        }
        catch (error) {
            logger.error('Error parsing message:', error);
            return;
        }
        logger.debug('Data:', data);
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
            'Could not sent message to server, WebSocket is not connected'
        );
    }
}
