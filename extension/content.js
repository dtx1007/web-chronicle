let isTracking = true;
let documentEventListeners = [];
let windowEventListeners = [];

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
        target: event.target.tagName,
        id: event.target.id,
        clases: event.target.classList,
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
