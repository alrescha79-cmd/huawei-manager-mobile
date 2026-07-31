/**
 * Console interceptor for debug mode.
 * Captures console.log/warn/error/info/debug into debug store when enabled.
 * ponytail: simple patch, upgrade to ring buffer + worker if logs > 1000/sec
 */

type ConsoleLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface AddConsoleLogFn {
    (log: { level: ConsoleLevel; message: string; data?: string }): void;
}

const originalConsole: Partial<Record<ConsoleLevel, (...args: any[]) => void>> = {};
let isInstalled = false;
let isCapturing = false; // prevent re-entrancy / infinite loop

function safeStringify(arg: any): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
    }
    try {
        // Handle circular refs
        const seen = new WeakSet();
        const json = JSON.stringify(arg, (_key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return '[Circular]';
                seen.add(value);
            }
            return value;
        }, 2);
        return json ?? String(arg);
    } catch {
        try {
            return String(arg);
        } catch {
            return '[Unserializable]';
        }
    }
}

function truncate(str: string, max = 1000): string {
    if (str.length <= max) return str;
    return str.slice(0, max) + `... [truncated ${str.length - max} chars]`;
}

export function installConsoleInterceptor(addConsoleLog: AddConsoleLogFn) {
    if (isInstalled) return;
    isInstalled = true;

    const levels: ConsoleLevel[] = ['log', 'warn', 'error', 'info', 'debug'];

    levels.forEach((level) => {
        const orig = console[level] as (...args: any[]) => void;
        originalConsole[level] = orig;

        console[level] = (...args: any[]) => {
            // Always call original first
            orig(...args);

            if (isCapturing) return;
            // Avoid capturing our own debug store logs or noisy internals
            try {
                isCapturing = true;
                const firstArg = args[0];
                // Skip if message looks like internal debug store noise
                if (typeof firstArg === 'string' && firstArg.includes('[DEBUG-STORE]')) {
                    return;
                }

                const message = args.map((a) => (typeof a === 'string' ? a : safeStringify(a))).join(' ');
                const truncatedMsg = truncate(message, 2000);

                // If multiple args and first is string, treat rest as data
                let data: string | undefined;
                if (args.length > 1 && typeof args[0] === 'string') {
                    const rest = args.slice(1).map(safeStringify).join(' ');
                    if (rest) data = truncate(rest, 2000);
                }

                addConsoleLog({
                    level,
                    message: truncatedMsg,
                    data,
                });
            } catch {
                // Silent fail - never break app due to logging
            } finally {
                isCapturing = false;
            }
        };
    });
}

export function uninstallConsoleInterceptor() {
    if (!isInstalled) return;
    const levels: ConsoleLevel[] = ['log', 'warn', 'error', 'info', 'debug'];
    levels.forEach((level) => {
        const orig = originalConsole[level];
        if (orig) {
            console[level] = orig as any;
        }
    });
    isInstalled = false;
    isCapturing = false;
}
