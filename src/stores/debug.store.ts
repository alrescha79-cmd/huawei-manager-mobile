import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';

export interface ApiLog {
    timestamp: number;
    endpoint: string;
    method: string;
    requestData?: any;
    responseData?: any;
    error?: string;
    duration: number;
}

export interface ModemDebugInfo {
    modemIp?: string;
    modemModel?: string;
    firmwareVersion?: string;
    imei?: string;
    networkOperator?: string;
    connectionStatus?: string;
    signalStrength?: string;
}

interface DebugState {
    debugEnabled: boolean;
    apiLogs: ApiLog[];
    modemInfo: ModemDebugInfo;

    setDebugEnabled: (enabled: boolean) => void;
    setModemInfo: (info: ModemDebugInfo) => void;
    addLog: (log: Omit<ApiLog, 'timestamp'>) => void;
    clearLogs: () => void;
    exportLogsAsText: () => string;
    createDebugFile: () => Promise<string>;
    sendDebugEmail: () => Promise<boolean>;
    shareDebugLog: () => Promise<void>;
}

const MAX_LOGS = 500;

export const useDebugStore = create<DebugState>()(
    persist(
        (set, get) => ({
            debugEnabled: false,
            apiLogs: [],
            modemInfo: {},

            setDebugEnabled: (enabled: boolean) => {
                set({ debugEnabled: enabled });
                if (enabled) {
                    try {
                        const { useModemStore } = require('./modem.store');
                        const { useAuthStore } = require('./auth.store');
                        const modemStore = useModemStore.getState();
                        const authStore = useAuthStore.getState();

                        const modemInfo = modemStore.modemInfo;
                        const signalInfo = modemStore.signalInfo;
                        const networkInfo = modemStore.networkInfo;

                        if (modemInfo || signalInfo || networkInfo) {
                            set({
                                modemInfo: {
                                    modemIp: authStore.credentials?.modemIp,
                                    modemModel: modemInfo?.deviceName,
                                    firmwareVersion: modemInfo?.softwareVersion,
                                    imei: modemInfo?.imei,
                                    networkOperator: networkInfo?.fullName || networkInfo?.networkName,
                                    connectionStatus: networkInfo?.currentNetworkType,
                                    signalStrength: signalInfo ? `${signalInfo.rssi || signalInfo.rsrp || 'N/A'} dBm` : undefined,
                                },
                            });
                        }
                    } catch (e) {
                        // Silent fail if stores not available
                    }
                } else {
                    set({ apiLogs: [], modemInfo: {} });
                }
            },

            setModemInfo: (info: ModemDebugInfo) => {
                set({ modemInfo: info });
            },

            addLog: (log: Omit<ApiLog, 'timestamp'>) => {
                const { debugEnabled, apiLogs } = get();
                if (!debugEnabled) return;

                const newLog: ApiLog = {
                    ...log,
                    timestamp: Date.now(),
                };

                const updatedLogs = [...apiLogs, newLog].slice(-MAX_LOGS);
                set({ apiLogs: updatedLogs });
            },

            clearLogs: () => {
                set({ apiLogs: [] });
            },

            exportLogsAsText: () => {
                const { apiLogs, modemInfo } = get();

                const deviceString = `${Device.manufacturer || ''} ${Device.modelName || 'Unknown Device'}`.trim();
                const osString = `${Device.osName || 'Unknown OS'} ${Device.osVersion || ''}`;

                const modemString = modemInfo.modemModel || 'Not connected';
                const firmwareString = modemInfo.firmwareVersion || 'N/A';

                const header = `========================================
HUAWEI MANAGER DEBUG LOG
Generated: ${new Date().toISOString()}
========================================

📱 DEVICE INFO:
   Device: ${deviceString}
   OS: ${osString}
   Brand: ${Device.brand || 'N/A'}

📡 MODEM INFO:
   Model: ${modemString}
   Firmware: ${firmwareString}
   IMEI: ${modemInfo.imei || 'N/A'}
   Network: ${modemInfo.networkOperator || 'N/A'}
   Connection: ${modemInfo.connectionStatus || 'N/A'}
   Signal: ${modemInfo.signalStrength || 'N/A'}
   IP: ${modemInfo.modemIp || 'N/A'}

========================================
API LOGS (${apiLogs.length} entries)
========================================

`;

                const logsText = apiLogs.map((log, index) => {
                    const date = new Date(log.timestamp).toISOString();
                    return `[${index + 1}] ${date}
Endpoint: ${log.endpoint}
Method: ${log.method}
Duration: ${log.duration}ms
${log.requestData ? `Request: ${JSON.stringify(log.requestData, null, 2)}` : ''}
${log.responseData ? `Response: ${JSON.stringify(log.responseData, null, 2)}` : ''}
${log.error ? `Error: ${log.error}` : ''}
----------------------------------------
`;
                }).join('\n');

                return header + logsText;
            },

            createDebugFile: async () => {
                const { exportLogsAsText } = get();
                const logText = exportLogsAsText();

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
                const deviceName = (Device.modelName || 'device').replace(/\s+/g, '_');
                const filename = `huawei_manager_debug_${deviceName}_${timestamp}.txt`;
                const file = new File(Paths.cache, filename);
                await file.write(logText);

                return file.uri;
            },

            sendDebugEmail: async () => {
                const { createDebugFile, modemInfo } = get();

                const isAvailable = await MailComposer.isAvailableAsync();
                if (!isAvailable) {
                    return false;
                }

                const fileUri = await createDebugFile();
                const deviceString = `${Device.manufacturer || ''} ${Device.modelName || 'Unknown Device'}`.trim();
                const osString = `${Device.osName || 'Unknown OS'} ${Device.osVersion || ''}`;
                const modemModel = modemInfo.modemModel || 'Unknown Modem';
                const firmwareVersion = modemInfo.firmwareVersion || 'N/A';

                const subject = `[Huawei Manager] Bug Report / Feature Request - ${modemModel}`;

                const body = `
=== BUG REPORT / FEATURE REQUEST ===

📱 Device: ${deviceString}
📲 OS: ${osString}
📡 Modem: ${modemModel}
🔧 Firmware: ${firmwareVersion}
📅 Date: ${new Date().toLocaleDateString()}

---

📝 Description (please fill in):
[Describe the bug or feature request here]

🔄 Steps to Reproduce (for bugs):
1. 
2. 
3. 

✅ Expected Behavior:
[What should happen]

❌ Actual Behavior:
[What actually happened]

📎 Debug log file attached.

---
Thank you for your feedback!
`;

                await MailComposer.composeAsync({
                    recipients: ['anggun@cakson.my.id'],
                    subject,
                    body,
                    attachments: [fileUri],
                });

                return true;
            },

            shareDebugLog: async () => {
                const { createDebugFile } = get();
                const fileUri = await createDebugFile();
                const isAvailable = await isAvailableAsync();
                if (isAvailable) {
                    await shareAsync(fileUri, {
                        mimeType: 'text/plain',
                        dialogTitle: 'Share Debug Log',
                    });
                } else {
                    throw new Error('Sharing not available');
                }
            },
        }),
        {
            name: 'debug-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                debugEnabled: state.debugEnabled,
                // Don't persist logs - they're session-only
            }),
        }
    )
);
