import React from 'react';
import { requestWidgetUpdate, requestWidgetUpdateById } from 'react-native-android-widget';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { ModemStatusWidget } from './ModemStatusWidget';
import { fetchWidgetData, fetchSpeedData, WidgetData } from './WidgetDataService';

const WIDGET_NAME = 'ModemStatus';
const SPEED_UPDATE_INTERVAL = 2000;
const FULL_UPDATE_INTERVAL = 30000;

let speedIntervalId: ReturnType<typeof setInterval> | null = null;
let fullDataIntervalId: ReturnType<typeof setInterval> | null = null;
let cachedFullData: WidgetData | null = null;
let updateCount = 0;
let isUpdating = false;

async function updateWidgetWithSpeed(): Promise<void> {
    if (isUpdating) {
        return;
    }

    isUpdating = true;
    try {
        const speedData = await fetchSpeedData();
        updateCount++;

        const mergedData: WidgetData = cachedFullData
            ? {
                ...cachedFullData,
                currentDownloadRate: speedData.currentDownloadRate,
                currentUploadRate: speedData.currentUploadRate,
                currentDownload: speedData.currentDownload,
                currentUpload: speedData.currentUpload,
                lastUpdated: Date.now(),
            }
            : {
                currentDownloadRate: speedData.currentDownloadRate,
                currentUploadRate: speedData.currentUploadRate,
                currentDownload: speedData.currentDownload,
                currentUpload: speedData.currentUpload,
                currentConnectTime: 0,
                monthDownload: 0,
                monthUpload: 0,
                monthDuration: 0,
                dayUsed: 0,
                dayDuration: 0,
                totalDownload: 0,
                totalUpload: 0,
                totalConnectTime: 0,
                connectionStatus: '901',
                networkType: '19',
                signalStrength: '5',
                lastUpdated: Date.now(),
            };

        await requestWidgetUpdate({
            widgetName: WIDGET_NAME,
            renderWidget: () => <ModemStatusWidget data={mergedData} />,
        });

        if (updateCount % 10 === 0) {
        }
    } catch (error) {
        if (updateCount % 10 === 0) {
        }
    } finally {
        isUpdating = false;
    }
}

async function updateWidgetWithFullData(): Promise<void> {
    try {
        cachedFullData = await fetchWidgetData();

        await requestWidgetUpdate({
            widgetName: WIDGET_NAME,
            renderWidget: () => <ModemStatusWidget data={cachedFullData!} />,
        });

    } catch (error) {
    }
}

export async function updateModemWidget(): Promise<void> {
    await updateWidgetWithFullData();
}

export function startRealtimeWidgetUpdates(): () => void {
    stopRealtimeWidgetUpdates();

    updateCount = 0;
    isUpdating = false;

    updateWidgetWithFullData();

    speedIntervalId = setInterval(() => {
        if (AppState.currentState === 'active') {
            updateWidgetWithSpeed();
        }
    }, SPEED_UPDATE_INTERVAL);

    fullDataIntervalId = setInterval(() => {
        updateWidgetWithFullData();
    }, FULL_UPDATE_INTERVAL);


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
