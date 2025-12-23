import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { ModemStatusWidget } from './ModemStatusWidget';
import { fetchWidgetData, fetchSpeedData, WidgetData } from './WidgetDataService';

const WIDGET_NAME = 'ModemStatus';

let speedIntervalId: ReturnType<typeof setInterval> | null = null;
let fullDataIntervalId: ReturnType<typeof setInterval> | null = null;
let cachedFullData: WidgetData | null = null;

async function updateWidgetWithSpeed(): Promise<void> {
    try {
        const speedData = await fetchSpeedData();

        const mergedData: WidgetData = cachedFullData
            ? {
                ...cachedFullData,
                downloadSpeed: speedData.downloadSpeed,
                uploadSpeed: speedData.uploadSpeed,
                sessionDownload: speedData.sessionDownload,
                sessionUpload: speedData.sessionUpload,
                lastUpdated: Date.now(),
            }
            : {
                downloadSpeed: speedData.downloadSpeed,
                uploadSpeed: speedData.uploadSpeed,
                sessionDownload: speedData.sessionDownload,
                sessionUpload: speedData.sessionUpload,
                monthDownload: 0,
                monthUpload: 0,
                totalDownload: 0,
                totalUpload: 0,
                connectionStatus: '901',
                networkType: '19',
                signalStrength: '5',
                lastUpdated: Date.now(),
            };

        await requestWidgetUpdate({
            widgetName: WIDGET_NAME,
            renderWidget: () => <ModemStatusWidget data={mergedData} />,
        });
    } catch {
        // Silently fail
    }
}

async function updateWidgetWithFullData(): Promise<void> {
    try {
        cachedFullData = await fetchWidgetData();

        await requestWidgetUpdate({
            widgetName: WIDGET_NAME,
            renderWidget: () => <ModemStatusWidget data={cachedFullData!} />,
        });
    } catch {
        // Silently fail
    }
}

export async function updateModemWidget(): Promise<void> {
    await updateWidgetWithFullData();
}

export function startRealtimeWidgetUpdates(): () => void {
    stopRealtimeWidgetUpdates();
    updateWidgetWithFullData();

    speedIntervalId = setInterval(() => {
        updateWidgetWithSpeed();
    }, 1000);

    fullDataIntervalId = setInterval(() => {
        updateWidgetWithFullData();
    }, 30000);

    return stopRealtimeWidgetUpdates;
}

export function stopRealtimeWidgetUpdates(): void {
    if (speedIntervalId) {
        clearInterval(speedIntervalId);
        speedIntervalId = null;
    }

    if (fullDataIntervalId) {
        clearInterval(fullDataIntervalId);
        fullDataIntervalId = null;
    }
}
