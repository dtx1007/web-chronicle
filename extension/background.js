import { Logger } from './logger.js';
import clientWebSocket from './websocket.js';

const WS_URL = 'ws://localhost:5000/ws';
const logger = new Logger('background.js');
let blacklistedSites = [];
let isTracking = true;

function setupWebSocket() {
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

function sendTabEventToServer(event_name, tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url && !isSiteBlacklisted(tab.url)) {
            const eventData = { event: event_name, tabId: tabId, url: tab.url };

            logger.debug('Tab event:', eventData);
            clientWebSocket.send('tab_event', eventData);
        }
    });
}

async function injectContentScriptToTab(tab) {
    const tabInfo = { tabId: tab.id, url: tab.url };

    // TODO: Inyectar el script solo en pagians HTTP o HTTPS
    if (tab.url && !isSiteBlacklisted(tab.url)) {
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

    // TODO: Cambiar esto para que espere a que la conexión se establezca realmente
    await sleep(1000);

    chrome.storage.sync.get({ blacklistedSites: [] }, (data) => {
        blacklistedSites = data.blacklistedSites;
        logger.info('Loaded blacklisted sites:', blacklistedSites);
    });

    chrome.storage.local.get({ trackingEnabled: true }, (data) => {
        isTracking = data.trackingEnabled;
        logger.info('Tracking enabled:', isTracking);
        sendTrackingStateToServer(isTracking);

        if (isTracking) {
            reinjectAllContentScripts();

            // Al iniciar el tracking, se envía un evento por cada tab abierta
            chrome.tabs.query({}, (tabs) => {
                if (tabs.length > 0) {
                    tabs.forEach((tab) => {
                        sendTabEventToServer('tab_created', tab.id);
                    });

                    sendTabEventToServer('tab_highlighted', tabs[0].id);
                }
            });

            // Enviar tambien información relacioanda a la ventana (tamaño y nivel de zoom)
            chrome.windows.getCurrent((window) => {
                const windowData = {
                    width: window.width,
                    height: window.height,
                    zoom: window.zoomFactor,
                };

                clientWebSocket.send('window_data', windowData);
            });
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
            sendTrackingStateToServer(isTracking);

            if (!isTracking) {
                const tabs = await chrome.tabs.query({});
                for (const tab of tabs) {
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            function: () => {
                                window.dispatchEvent(
                                    new CustomEvent('tracking_disabled')
                                );
                            },
                        });
                        logger.debug(
                            'Content script listeners stopped for tab:',
                            tab.id
                        );
                    } catch (error) {
                        logger.error('Error stopping content script:', error);
                    }
                }
            } else {
                await reinjectAllContentScripts();
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
