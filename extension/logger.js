export class Logger {
    constructor(name) {
        this.name = name;
    }

    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] [${this.name}] ${message}`;

        switch (level) {
            case 'WARN':
                console.warn(formattedMessage, ...args);
                break;
            case 'ERROR':
                console.error(formattedMessage, ...args);
                break;
            case 'DEBUG':
                console.debug(formattedMessage, ...args);
                break;
            case 'INFO':
            default:
                console.log(formattedMessage, ...args);
        }
    }

    info(message, ...args) {
        this.log('INFO', message, ...args);
    }

    warn(message, ...args) {
        this.log('WARN', message, ...args);
    }

    error(message, ...args) {
        this.log('ERROR', message, ...args);
    }

    debug(message, ...args) {
        this.log('DEBUG', message, ...args);
    }
}
