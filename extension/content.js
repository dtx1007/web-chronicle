function logEvent(eventName, details) {
    const eventData = {
        timestamp: new Date().toISOString(),
        event: eventName,
        details: details,
    };

    chrome.runtime.sendMessage({ type: 'event_logged', message: eventData });
}

function registerSimpleEvent(eventName, details) {
    return (event) => {
        logEvent(eventName, details(event));
    };
}

function registerDebouncedEvent(eventName, details, debounceTime) {
    let timeout = null;

    return (event) => {
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
        events.push(event);

        if (events.length >= maxEvents) {
            logEvent(eventName, details(events));
            events = [];
        }
    };
}

// Registro de eventos

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

document.addEventListener('click', logClick);
document.addEventListener('scroll', logScroll);
document.querySelectorAll('keydown', logInput);
