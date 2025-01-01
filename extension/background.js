import { Logger } from './logger.js';
import { setupWebSocket, notifyServer } from './websocket.js';

const logger = new Logger('background.js');
let blacklistedSites = [];
let isTracking = true;
let ws;

function sendTrackingStateToServer(enabled) {
    const stateData = {
        timestamp: new Date().toISOString(),
        enabled: enabled,
        sessionId: null
    };

    chrome.storage.local.get(['sessionId'], (data) => {
        if (data.sessionId) {
            stateData.sessionId = data.sessionId;
        }
        notifyServer(ws, 'tracking_state_changed', stateData);
    });
}

async function injectContentScriptToTab(tab) {
    if (!tab.url) return;
    
    try {
        const url = new URL(tab.url);
        if (!blacklistedSites.some((site) => url.hostname.includes(site))) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            logger.debug('Content script injected to tab:', tab.id);
        }
    } catch (error) {
        logger.error('Error injecting content script:', error);
    }
}

async function reinjectAllContentScripts() {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        await injectContentScriptToTab(tab);
    }
}

function initExtension() {
    logger.info('Extension started');
    ws = setupWebSocket();

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
        }
    });

    chrome.storage.onChanged.addListener(async (changes, area) => {
        if (area === 'sync' && changes.blacklistedSites) {
            blacklistedSites = changes.blacklistedSites.newValue || [];
            logger.info('Updated blacklisted sites:', blacklistedSites);
            notifyServer(ws, 'update_blacklist', blacklistedSites);
            
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
                                window.dispatchEvent(new CustomEvent('tracking_disabled'));
                            }
                        });
                    } catch (error) {
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
        notifyServer(ws, 'event_logged', eventData);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isTracking) return;

    if (changeInfo.status === 'complete') {
        injectContentScriptToTab(tab);
    }
});