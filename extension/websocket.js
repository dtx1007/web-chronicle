import { Logger } from './logger.js';

const logger = new Logger('websocket.js');

class WebSocketClient {
    constructor() {
        if (!WebSocketClient.instace) {
            this.ws = null;
            this.sendQueue = [];
            WebSocketClient.instance = this;
        }

        return WebSocketClient.instance;
    }

    onOpen(callback) {
        if (this.ws) {
            this.ws.addEventListener('open', callback);
        }
    }

    onClose(callback) {
        if (this.ws) {
            this.ws.addEventListener('close', callback);
        }
    }

    onError(callback) {
        if (this.ws) {
            this.ws.addEventListener('error', (error) => callback(error));
        }
    }

    onAnyMessage(callback) {
        if (this.ws) {
            this.ws.addEventListener('message', (event) => {
                const messageData = this.checkMessageFormat(event.data);

                if (messageData) {
                    callback(messageData);
                }
            });
        }
    }

    onMessage(type, callback) {
        if (this.ws) {
            this.ws.addEventListener('message', (event) => {
                const messageData = this.checkMessageFormat(event.data);

                if (messageData && messageData.type === type) {
                    callback(messageData.message);
                }
            });
        }
    }

    checkMessageFormat(message) {
        try {
            const data = JSON.parse(message);
            if (this.isValidMessage(data)) {
                return data;
            } else {
                logger.error('Invalid message format received:', data);
            }
        } catch (error) {
            logger.error('Error parsing message:', error);
        }
    }

    isValidMessage(data) {
        return data.hasOwnProperty('type') && data.hasOwnProperty('message');
    }

    connect(url) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.close();
            logger.info(
                'WebSocket already openned, closing existing WebSocket connection...'
            );
        }

        logger.info('Connecting to WebSocket:', { url });
        this.ws = new WebSocket(url);
    }

    close() {
        if (this.ws) {
            logger.info('Closing WebSocket connection...');
            this.ws.close();
        }
    }

    send(type, message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            if (this.sendQueue.length > 0) {
                this.sendQueue.forEach((data) => {
                    this.ws.send(data);
                });
                this.sendQueue = [];
            }

            this.ws.send(JSON.stringify({ type, message }));
        } else {
            this.sendQueue.push(JSON.stringify({ type, message }));
            logger.warn(
                'Could not send message to server, WebSocket is not connected, data:',
                {
                    type,
                    message,
                }
            );
        }
    }
}

const clientWebSocket = new WebSocketClient();
const WS_URL = 'ws://localhost:5000/ws';

export default clientWebSocket;

export function setupWebSocket() {
    clientWebSocket.connect(WS_URL);
    clientWebSocket.onOpen(() => {
        logger.info('WebSocket connection established');
    });

    clientWebSocket.onClose(() => {
        logger.info('WebSocket connection closed');
        setTimeout(clientWebSocket.connect(WS_URL), 5000);
    });

    clientWebSocket.onAnyMessage((message) => {
        logger.info('Message received:', message);
    });

    clientWebSocket.onError((error) => {
        logger.error('WebSocket error:', error);
    });
}
