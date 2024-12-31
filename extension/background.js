import { Logger } from './logger.js';
import { setupWebSocket, notifyServer } from './websocket.js';

const logger = new Logger('background.js');
let blacklistedSites = [];

let ws;

function initExtension() {
    logger.info('Extension started');
    ws = setupWebSocket();

    chrome.storage.sync.get({ blacklistedSites: [] }, (data) => {
        blacklistedSites = data.blacklistedSites;
        logger.info('Loaded blacklisted sites:', blacklistedSites);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.blacklistedSites) {
            blacklistedSites = changes.blacklistedSites.newValue || [];
            logger.info('Updated blacklisted sites:', blacklistedSites);

            notifyServer(ws, 'update_blacklist', blacklistedSites);
        }
    });
}

chrome.runtime.onInstalled.addListener(initExtension);
chrome.runtime.onStartup.addListener(initExtension);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'event_logged') {
        const eventData = message.message;
        logger.info('Event logged:', eventData);
        notifyServer(ws, 'event_logged', eventData);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const url = new URL(tab.url);

        logger.debug('Tab updated:', tab);
        logger.debug('Tab URL:', url);

        if (!blacklistedSites.some((site) => url.hostname.includes(site))) {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js'],
            });
        }
    }
});
