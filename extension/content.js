let isTracking = true;
let documentEventListeners = [];
let windowEventListeners = [];

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;
}

// From: https://gist.github.com/abkarim/ab0e0e3b629e9a80c31db323f4373bcb
/**
 * Get absolute xPath position from dom element
 * xPath position will does not contain any id, class or attribute, etc selector
 * Because, Some page use random id and class. This function should ignore that kind problem, so we're not using any selector
 *
 * @param {Element} element element to get position
 * @returns {String} xPath string
 */
function getXPath(element) {
    // Selector
    let selector = '';
    // Loop handler
    let foundRoot;
    // Element handler
    let currentElement = element;

    // Do action until we reach html element
    do {
        // Get element tag name
        const tagName = currentElement.tagName.toLowerCase();
        // Get parent element
        const parentElement = currentElement.parentElement;

        // Count children
        if (parentElement.childElementCount > 1) {
            // Get children of parent element
            const parentsChildren = [...parentElement.children];
            // Count current tag
            let tag = [];
            parentsChildren.forEach((child) => {
                if (child.tagName.toLowerCase() === tagName) tag.push(child); // Append to tag
            });

            // Is only of type
            if (tag.length === 1) {
                // Append tag to selector
                selector = `/${tagName}${selector}`;
            } else {
                // Get position of current element in tag
                const position = tag.indexOf(currentElement) + 1;
                // Append tag to selector
                selector = `/${tagName}[${position}]${selector}`;
            }
        } else {
            //* Current element has no siblings
            // Append tag to selector
            selector = `/${tagName}${selector}`;
        }

        // Set parent element to current element
        currentElement = parentElement;
        // Is root
        foundRoot = parentElement.tagName.toLowerCase() === 'html';
        // Finish selector if found root element
        if (foundRoot) selector = `/html${selector}`;
    } while (foundRoot === false);

    // Return selector
    return selector;
}

function logEvent(eventName, details) {
    if (!isTracking) return;

    const eventData = {
        timestamp: new Date().toISOString(),
        event: eventName,
        details: details,
    };

    chrome.runtime.sendMessage({ type: 'event_logged', message: eventData });
}

function registerSimpleEvent(eventName, details) {
    return (event) => {
        if (!isTracking) return;
        logEvent(eventName, details(event));
    };
}

function registerDebouncedEvent(eventName, details, debounceTime) {
    let timeout = null;

    return (event) => {
        if (!isTracking) return;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            logEvent(eventName, details(event));
        }, debounceTime);
    };
}

function registerBufferedEvent(eventName, details, maxEvents) {
    let events = [];

    return (event) => {
        if (!isTracking) return;

        events.push(event);

        if (events.length >= maxEvents) {
            logEvent(eventName, details(events));
            events = [];
        }
    };
}

function attachEventListeners(documentEventListeners, windowEventListeners) {
    documentEventListeners.forEach((listener) => {
        document.addEventListener(listener.type, listener.handler);
    });

    windowEventListeners.forEach((listener) => {
        window.addEventListener(listener.type, listener.handler);
    });
}

function removeEventListeners(documentEventListeners, windowEventListeners) {
    documentEventListeners.forEach((listener) => {
        document.removeEventListener(listener.type, listener.handler);
    });

    windowEventListeners.forEach((listener) => {
        window.removeEventListener(listener.type, listener.handler);
    });

    documentEventListeners = [];
    windowEventListeners = [];
}

const logClick = registerSimpleEvent('click', (event) => {
    return {
        path: getXPath(event.target),
        target: event.target.tagName,
        x: event.clientX,
        y: event.clientY,
    };
});

const logScroll = registerDebouncedEvent(
    'scroll',
    (event) => {
        return {
            x: window.scrollX,
            y: window.scrollY,
        };
    },
    500
);

const logInput = registerSimpleEvent('input', (event) => {
    return {
        path: getXPath(event.target),
        target: event.target.tagName,
        key: event.key,
        modAlt: event.altKey,
        modCtrl: event.ctrlKey,
        modShift: event.shiftKey,
        modMeta: event.metaKey,
    };
});

const logResize = registerDebouncedEvent(
    'resize',
    () => {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    },
    500
);

documentEventListeners = [
    { type: 'click', handler: logClick },
    { type: 'scroll', handler: logScroll },
    { type: 'keydown', handler: logInput },
];

windowEventListeners = [{ type: 'resize', handler: logResize }];

// Verificar estado inicial del tracking y configurar listeners
chrome.storage.local.get({ trackingEnabled: true }, (data) => {
    isTracking = data.trackingEnabled;
    if (isTracking) {
        attachEventListeners(documentEventListeners, windowEventListeners);
    }
});

// Escuchar cambios en el estado del tracking
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.trackingEnabled) {
        isTracking = changes.trackingEnabled.newValue;
        if (isTracking) {
            attachEventListeners(documentEventListeners, windowEventListeners);
        } else {
            removeEventListeners(documentEventListeners, windowEventListeners);
        }
    }
});

window.addEventListener('tracking_disabled', () => {
    isTracking = false;
    removeEventListeners(documentEventListeners, windowEventListeners);
});

if (isTracking) {
    attachEventListeners(documentEventListeners, windowEventListeners);
}
