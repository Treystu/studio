// A simple logger to capture console messages for diagnostics.
type LogEntry = {
    level: 'log' | 'info' | 'warn' | 'error';
    timestamp: string;
    message: string;
    args: any[];
};

class Logger {
    private logs: LogEntry[] = [];
    private originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
    };
    private isInitialized = false;
    private isVerbose = true; // Always on

    init() {
        if (this.isInitialized || typeof window === 'undefined') {
            return;
        }

        console.log = (...args: any[]) => {
            this.addLog('log', args);
            this.originalConsole.log.apply(console, args);
        };

        console.info = (...args: any[]) => {
            this.addLog('info', args);
            this.originalConsole.info.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            this.addLog('warn', args);
            this.originalConsole.warn.apply(console, args);
        };

        console.error = (...args: any[]) => {
            this.addLog('error', args);
            this.originalConsole.error.apply(console, args);
        };
        
        this.isInitialized = true;
        this.info(`Logger initialized.`);
    }

    private addLog(level: LogEntry['level'], args: any[]) {
        try {
            const message = args.map(arg => {
                if (typeof arg === 'string') return arg;
                // Avoid "[object Object]" and circular references
                try {
                    return JSON.stringify(arg, (key, value) => 
                        typeof value === 'bigint' ? value.toString() : value
                    , 2);
                } catch {
                    return 'UnserializableObject';
                }
            }).join(' ');

            this.logs.push({
                level,
                timestamp: new Date().toISOString(),
                message,
                args: [], // For simplicity, we won't store the raw args to avoid circular ref issues
            });

            // Keep the log array from growing indefinitely
            if (this.logs.length > 1000) { 
                this.logs.shift();
            }
        } catch (e) {
            this.originalConsole.error("Error in custom logger:", e);
        }
    }

    getLogs() {
        return this.logs;
    }
    
    isVerboseEnabled() {
        return this.isVerbose;
    }

    log(...args: any[]) { this.addLog('log', args); this.originalConsole.log.apply(console, args); }
    info(...args: any[]) { this.addLog('info', args); this.originalConsole.info.apply(console, args); }
    warn(...args: any[]) { this.addLog('warn', args); this.originalConsole.warn.apply(console, args); }
    error(...args: any[]) { this.addLog('error', args); this.originalConsole.error.apply(console, args); }
}

export const logger = new Logger();
