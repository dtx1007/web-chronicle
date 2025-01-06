import { Logger } from './logger.js';
import clientWebSocket from './websocket.js';

const WS_URL = 'ws://localhost:5000/ws';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const logger = new Logger('background.js');
let blacklistedSites = [];
let isTracking = true;

function setupWebSocket() {
    const MAX_RECONNECT_ATTEMPTS = 25;
    const SHORT_RECONNECT_DELAY = 5000; // 5 seconds
    const LONG_RECONNECT_DELAY = 60000; // 1 minute
    let numReconnects = 0;
    let reconnectInterval = null;

    function attemptReconnect() {
        if (numReconnects >= MAX_RECONNECT_ATTEMPTS) {
            logger.error('Max reconnect attempts reached. Stopping reconnection attempts.');
            clearInterval(reconnectInterval);
            return;
        }

        if (numReconnects % 5 === 0 && numReconnects !== 0) {
            logger.info('Reached 5 reconnect attempts, waiting 1 minute before next attempt.');
            clearInterval(reconnectInterval);
            setTimeout(() => {
                reconnectInterval = setInterval(attemptReconnect, SHORT_RECONNECT_DELAY);
            }, LONG_RECONNECT_DELAY);
        } else {
            logger.info(
                `Attempting to reconnect... (${numReconnects + 1}/${MAX_RECONNECT_ATTEMPTS})`
            );
            clientWebSocket.connect(WS_URL);
            numReconnects++;
        }
    }

    clientWebSocket.connect(WS_URL);
    clientWebSocket.onOpen(() => {
        logger.info('WebSocket connection established');
        numReconnects = 0;
        clearInterval(reconnectInterval);
    });

    clientWebSocket.onClose(() => {
        logger.info('WebSocket connection closed, reconnecting in 5s...');
        reconnectInterval = setInterval(attemptReconnect, SHORT_RECONNECT_DELAY);
    });

    clientWebSocket.onAnyMessage((message) => {
        logger.info('Message received:', message);
    });

    clientWebSocket.onError((error) => {
        logger.error('WebSocket error:', error);
    });
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function notifySessionEnd(sessionId) {
    clientWebSocket.send('session_state_changed', {
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        action: 'end',
    });
}

function notifySessionStart(sessionId) {
    clientWebSocket.send('session_state_changed', {
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        action: 'start',
    });
}

function startNewSession() {
    const newSessionId = generateSessionId();
    const now = Date.now();

    chrome.storage.local.set(
        {
            sessionId: newSessionId,
            sessionStart: now,
            lastActivity: now,
        },
        () => {
            notifySessionStart(newSessionId);
        }
    );

    return newSessionId;
}

function checkAndHandleInactivity() {
    chrome.storage.local.get(['lastActivity', 'sessionId', 'trackingEnabled'], (data) => {
        const now = Date.now();

        if (!data.trackingEnabled) {
            logger.info('Tracking is disabled, skipping inactivity check');
            return;
        }

        if (!data.lastActivity || !data.sessionId) {
            logger.info('No previous session found, starting new session');
            startNewSession();
            return;
        }

        const timeSinceLastActivity = now - data.lastActivity;
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
            logger.info('Session timeout detected, starting new session');
            notifySessionEnd(data.sessionId);
            startNewSession();
        } else {
            logger.info('Session is still active', {
                sessionId: data.sessionId,
                timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000) + 's',
            });
        }
    });
}

function sendTrackingStateToServer(enabled) {
    const stateData = {
        timestamp: new Date().toISOString(),
        enabled: enabled,
        sessionId: null,
    };

    chrome.storage.local.get(['sessionId'], (data) => {
        if (data.sessionId) {
            stateData.sessionId = data.sessionId;
        }
        clientWebSocket.send('tracking_state_changed', stateData);
    });
}

function isSiteBlacklisted(url) {
    if (!url) return true;

    try {
        const siteUrl = new URL(url);

        if (blacklistedSites.some((site) => siteUrl.hostname.includes(site))) {
            logger.debug('Site is blacklisted:', { url });
            return true;
        }

        return false;
    } catch (error) {
        logger.error('Error checking blacklisted site:', error);
        return false;
    }
}

function isHostAllowed(url) {
    if (!url) return false;

    try {
        const siteUrl = new URL(url);

        if (siteUrl.protocol === 'https:' || siteUrl.protocol === 'http:') {
            return true;
        }

        return false;
    } catch (error) {
        logger.error('Error checking allowed host:', error);
        return false;
    }
}

function sendTabEventToServer(event_name, tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url && isHostAllowed(tab.url) && !isSiteBlacklisted(tab.url)) {
            const eventData = {
                event: event_name,
                timestamp: new Date().toISOString(),
                details: {
                    tabId: tabId,
                    url: tab.url,
                },
            };

            logger.debug('Tab event:', eventData);
            clientWebSocket.send('tab_event', eventData);
        }
    });
}

async function sendInitialTabAndWindowInfoToServer() {
    // Enviar un evento por cada tab abierta
    await chrome.tabs.query({}, (tabs) => {
        if (tabs.length > 0) {
            tabs.forEach((tab) => {
                sendTabEventToServer('tab_created', tab.id);
            });

            // Tener en cuenta que no siempre es la tab 1 la que está activa
            sendTabEventToServer('tab_highlighted', tabs[0].id);
        }
    });

    // Enviar también información relacionada a la ventana (tamaño y nivel de zoom)
    await chrome.windows.getCurrent((window) => {
        const windowData = {
            width: window.width,
            height: window.height,
            zoom: window.zoomFactor,
        };

        clientWebSocket.send('window_data', windowData);
    });
}

async function injectContentScriptToTab(tab) {
    const tabInfo = { tabId: tab.id, url: tab.url };

    // Inyectar el script solo en páginas HTTP o HTTPS
    if (tab.url && isHostAllowed(tab.url) && !isSiteBlacklisted(tab.url)) {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
        });
        logger.debug('Content script injected to tab:', tabInfo);
    }
}

async function reinjectAllContentScripts() {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        await injectContentScriptToTab(tab);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initExtension() {
    logger.info('Extension started');
    setupWebSocket();

    await new Promise((resolve) => {
        clientWebSocket.onOpen(resolve);
    });

    chrome.storage.sync.get({ blacklistedSites: [] }, (data) => {
        blacklistedSites = data.blacklistedSites;
        logger.info('Loaded blacklisted sites:', blacklistedSites);
    });

    chrome.storage.local.get({ trackingEnabled: true }, (data) => {
        isTracking = data.trackingEnabled;
        logger.info('Tracking enabled:', isTracking);
        sendTrackingStateToServer(isTracking);

        if (isTracking) {
            checkAndHandleInactivity();
            reinjectAllContentScripts();
            sendInitialTabAndWindowInfoToServer();
        }
    });

    chrome.storage.onChanged.addListener(async (changes, area) => {
        if (area === 'sync' && changes.blacklistedSites) {
            blacklistedSites = changes.blacklistedSites.newValue || [];
            logger.info('Updated blacklisted sites:', blacklistedSites);
            clientWebSocket.send('update_blacklist', blacklistedSites);

            if (isTracking) {
                await reinjectAllContentScripts();
            }
        }

        if (area === 'local' && changes.trackingEnabled) {
            isTracking = changes.trackingEnabled.newValue;
            logger.info('Tracking state changed:', isTracking);

            if (!isTracking) {
                // Al desactivar tracking:
                // 1. Obtener la sesión actual
                // 2. Notificar que se cierra
                // 3. Eliminar los datos de la sesión
                chrome.storage.local.get(['sessionId'], (data) => {
                    if (data.sessionId) {
                        notifySessionEnd(data.sessionId);
                        chrome.storage.local.remove(['sessionId', 'sessionStart', 'lastActivity']);
                    }
                });

                // Detener scripts en las pestañas
                const tabs = await chrome.tabs.query({});
                for (const tab of tabs) {
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            function: () => {
                                window.dispatchEvent(new CustomEvent('tracking_disabled'));
                            },
                        });
                        logger.debug('Content script listeners stopped for tab:', tab.id);
                    } catch (error) {
                        logger.error('Error stopping content script:', error);
                    }
                }
            } else {
                // Al activar tracking:
                // 1. Generar nueva sesión
                // 2. Notificar nueva sesión
                const newSessionId = generateSessionId();
                const now = Date.now();

                chrome.storage.local.set(
                    {
                        sessionId: newSessionId,
                        sessionStart: now,
                        lastActivity: now,
                    },
                    () => {
                        notifySessionStart(newSessionId);
                    }
                );

                await reinjectAllContentScripts();
                sendInitialTabAndWindowInfoToServer();
            }
        }
    });
}

chrome.runtime.onInstalled.addListener(initExtension);
chrome.runtime.onStartup.addListener(initExtension);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isTracking) return;

    if (message.type === 'event_logged') {
        const eventData = message.message;
        logger.info('Event logged:', eventData);
        clientWebSocket.send('event_logged', eventData);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isTracking) return;

    if (changeInfo.status === 'complete') {
        sendTabEventToServer('tab_updated', tabId);
        injectContentScriptToTab(tab);
    }
});

chrome.tabs.onHighlighted.addListener((highlightInfo) => {
    if (!isTracking) return;
    sendTabEventToServer('tab_highlighted', highlightInfo.tabIds[0]);
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (!isTracking) return;

    const eventData = { event: 'tab_closed', tabId: tabId, url: '' };

    logger.debug('Tab event:', eventData);
    clientWebSocket.send('tab_event', eventData);
});

chrome.tabs.onCreated.addListener((tab) => {
    if (!isTracking) return;
    sendTabEventToServer('tab_created', tab.id);
});
