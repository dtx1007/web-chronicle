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

function updateTrackingButton(isEnabled) {
    const trackingButton = document.getElementById('toggleTracking');
    if (isEnabled) {
        trackingButton.style.backgroundColor = '#4CAF50'; // Verde
        trackingButton.textContent = 'Tracking Enabled';
    } else {
        trackingButton.style.backgroundColor = '#f44336'; // Rojo
        trackingButton.textContent = 'Tracking Disabled';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get({ trackingEnabled: true }, (data) => {
        updateTrackingButton(data.trackingEnabled);
    });

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

    document.getElementById('toggleTracking').addEventListener('click', () => {
        chrome.storage.sync.get({ trackingEnabled: true }, (data) => {
            const newState = !data.trackingEnabled;
            chrome.storage.sync.set({ trackingEnabled: newState }, () => {
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