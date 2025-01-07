function getDomainFromUrl(url) {
    try {
        const urlObject = new URL(url);
        return urlObject.hostname;
    } catch (e) {
        return null;
    }
}

function addCurrentSiteToBlacklist() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            const domain = getDomainFromUrl(tabs[0].url);
            if (domain) {
                addSiteToBlacklist(domain);
            }
        }
    });
}

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function updateSessionInfo() {
    chrome.storage.local.get(['sessionId', 'sessionStart', 'trackingEnabled', 'lastActivity'], (data) => {
        const now = Date.now();
        const sessionId = document.getElementById('sessionId');
        const sessionDuration = document.getElementById('sessionDuration');
        const sessionStatus = document.getElementById('sessionStatus');

        if (!data.trackingEnabled) {
            sessionId.textContent = '-';
            sessionDuration.textContent = '-';
            sessionStatus.textContent = 'Tracking Disabled';
        } else if (!data.sessionId) {
            sessionId.textContent = '-';
            sessionDuration.textContent = '-';
            sessionStatus.textContent = 'No Active Session';
        } else {
            sessionId.textContent = data.sessionId;
            sessionDuration.textContent = formatDuration(now - data.sessionStart);
            sessionStatus.textContent = 'Active';
            chrome.storage.local.set({ lastActivity: now });
        }
    });
}

function updateBlacklistUI(blacklistedSites) {
    const blacklistElement = document.getElementById('blacklist');
    if (!blacklistElement) return;

    blacklistElement.innerHTML = '';

    blacklistedSites.forEach((site) => {
        const listItem = document.createElement('li');
        listItem.textContent = site;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.style.marginLeft = '10px';
        removeButton.onclick = () => removeSiteFromBlacklist(site);

        listItem.appendChild(removeButton);
        blacklistElement.appendChild(listItem);
    });
}

function addSiteToBlacklist(site) {
    if (!site) return;

    chrome.storage.sync.get({ blacklistedSites: [] }, (data) => {
        const updatedBlacklist = [...new Set([...data.blacklistedSites, site])];
        chrome.storage.sync.set({ blacklistedSites: updatedBlacklist }, () => {
            updateBlacklistUI(updatedBlacklist);
        });
    });
}

function removeSiteFromBlacklist(site) {
    chrome.storage.sync.get({ blacklistedSites: [] }, (data) => {
        const updatedBlacklist = data.blacklistedSites.filter((s) => s !== site);
        chrome.storage.sync.set({ blacklistedSites: updatedBlacklist }, () => {
            updateBlacklistUI(updatedBlacklist);
        });
    });
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateTrackingButton(isEnabled) {
    const trackingButton = document.getElementById('toggleTracking');
    if (isEnabled) {
        trackingButton.style.backgroundColor = '#4CAF50';
        trackingButton.textContent = 'Tracking Enabled';
    } else {
        trackingButton.style.backgroundColor = '#f44336';
        trackingButton.textContent = 'Tracking Disabled';
 }
    updateSessionInfo();
}

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get({ trackingEnabled: true }, (data) => {
        updateTrackingButton(data.trackingEnabled);
    });

    updateSessionInfo();
    setInterval(updateSessionInfo, 1000);

    chrome.storage.sync.get({ blacklistedSites: [] }, (data) => {
        updateBlacklistUI(data.blacklistedSites);
    });

    document.getElementById('addBlacklistSite').addEventListener('click', () => {
        const site = document.getElementById('siteInput').value.trim();
        if (site) {
            addSiteToBlacklist(site);
            document.getElementById('siteInput').value = '';
        }
    });

    document.getElementById('addCurrentSite').addEventListener('click', addCurrentSiteToBlacklist);

    document.getElementById('toggleTracking').addEventListener('click', () => {
        chrome.storage.local.get({ trackingEnabled: true }, (data) => {
            const newState = !data.trackingEnabled;

            if (newState) {
                // Al activar, creamos sesión
                const newSessionId = generateSessionId();
                const now = Date.now();

                chrome.storage.local.set({
                    sessionId: newSessionId,
                    sessionStart: now,
                    lastActivity: now
                });
            }

            chrome.storage.local.set({ trackingEnabled: newState }, () => {
                updateTrackingButton(newState);
            });
        });
    });

    document.getElementById('openDashboard').addEventListener('click', () => {
        chrome.windows.create({
            url: 'http://localhost:5000',
            type: 'popup',
            width: 1024,
            height: 768
        });
    });
});
