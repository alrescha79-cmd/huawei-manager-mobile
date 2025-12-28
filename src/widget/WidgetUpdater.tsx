import React from 'react';
import { requestWidgetUpdate, requestWidgetUpdateById } from 'react-native-android-widget';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { ModemStatusWidget } from './ModemStatusWidget';
import { fetchWidgetData, fetchSpeedData, WidgetData } from './WidgetDataService';

const WIDGET_NAME = 'ModemStatus';
const SPEED_UPDATE_INTERVAL = 2000; // 2 seconds - balance between responsiveness and performance
const FULL_UPDATE_INTERVAL = 30000; // 30 seconds

let speedIntervalId: ReturnType<typeof setInterval> | null = null;
let fullDataIntervalId: ReturnType<typeof setInterval> | null = null;
let cachedFullData: WidgetData | null = null;
let updateCount = 0;
let isUpdating = false;

/**
 * Update widget with speed data only (fast update, ~2s interval)
 * 
 * IMPORTANT: No authentication required! Widget can update without login.
 * Uses /api/monitoring/traffic-statistics endpoint which is publicly accessible.
 * 
 * Note: Uses a flag to prevent concurrent updates.
 */
async function updateWidgetWithSpeed(): Promise<void> {
    // Prevent concurrent updates
    if (isUpdating) {
        return;
    }

    isUpdating = true;
    try {
        const speedData = await fetchSpeedData();
        updateCount++;

        // Merge speed data with cached full data
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
                // Speed data
                currentDownloadRate: speedData.currentDownloadRate,
                currentUploadRate: speedData.currentUploadRate,
                // Session data
                currentDownload: speedData.currentDownload,
                currentUpload: speedData.currentUpload,
                currentConnectTime: 0,
                // Monthly data
                monthDownload: 0,
                monthUpload: 0,
                monthDuration: 0,
                // Daily data
                dayUsed: 0,
                dayDuration: 0,
                // Total data
                totalDownload: 0,
                totalUpload: 0,
                totalConnectTime: 0,
                // Connection info
                connectionStatus: '901',
                networkType: '19',
                signalStrength: '5',
                lastUpdated: Date.now(),
            };

        // Use requestWidgetUpdate to force update
        await requestWidgetUpdate({
            widgetName: WIDGET_NAME,
            renderWidget: () => <ModemStatusWidget data={mergedData} />,
            widgetNotExist: 'ignore', // Don't throw error if widget doesn't exist
        });

        if (updateCount % 10 === 0) {
            console.log(`[Widget] Speed update #${updateCount}: ${(speedData.currentDownloadRate / 1024 / 1024).toFixed(2)} MB/s down, ${(speedData.currentUploadRate / 1024 / 1024).toFixed(2)} MB/s up`);
        }
    } catch (error) {
        if (updateCount % 10 === 0) {
            console.log('[Widget] Speed update failed:', error);
        }
    } finally {
        isUpdating = false;
    }
}

/**
 * Update widget with full data (slower update, ~30s interval)
 * 
 * IMPORTANT: No authentication required! Widget can update without login.
 * Fetches from multiple monitoring endpoints that are publicly accessible:
 * - /api/monitoring/traffic-statistics
 * - /api/monitoring/month_statistics
 * - /api/monitoring/status
 */
async function updateWidgetWithFullData(): Promise<void> {
    try {
        cachedFullData = await fetchWidgetData();

        await requestWidgetUpdate({
            widgetName: WIDGET_NAME,
            renderWidget: () => <ModemStatusWidget data={cachedFullData!} />,
            widgetNotExist: 'ignore', // Don't throw error if widget doesn't exist
        });

        console.log('[Widget] Full data update complete');
    } catch (error) {
        console.log('[Widget] Full data update failed:', error);
    }
}

export async function updateModemWidget(): Promise<void> {
    await updateWidgetWithFullData();
}

/**
 * Start realtime widget updates
 * - Speed updates every 2 seconds (download/upload rates, session traffic)
 * - Full data updates every 30 seconds (monthly, daily, total traffic, signal, etc)
 * 
 * IMPORTANT: Widget updates work WITHOUT authentication!
 * The modem's monitoring endpoints are publicly accessible.
 * 
 * Note: 2-second interval provides good balance between responsiveness and performance.
 * Widget will only update when app is in foreground to save battery.
 * 
 * @returns Function to stop updates
 */
export function startRealtimeWidgetUpdates(): () => void {
    console.log('[Widget] Starting realtime updates...');
    stopRealtimeWidgetUpdates();
    
    // Reset counter and flag
    updateCount = 0;
    isUpdating = false;
    
    // Initial full update
    updateWidgetWithFullData();

    // Speed updates every 2 seconds
    speedIntervalId = setInterval(() => {
        // Only update if app is active
        if (AppState.currentState === 'active') {
            updateWidgetWithSpeed();
        }
    }, SPEED_UPDATE_INTERVAL);

    // Full data updates every 30 seconds
    fullDataIntervalId = setInterval(() => {
        updateWidgetWithFullData();
    }, FULL_UPDATE_INTERVAL);

    console.log(`[Widget] Updates started: speed every ${SPEED_UPDATE_INTERVAL}ms, full every ${FULL_UPDATE_INTERVAL}ms`);

    return stopRealtimeWidgetUpdates;
}

export function stopRealtimeWidgetUpdates(): void {
    if (speedIntervalId) {
        clearInterval(speedIntervalId);
        speedIntervalId = null;
        console.log('[Widget] Speed updates stopped');
    }

    if (fullDataIntervalId) {
        clearInterval(fullDataIntervalId);
        fullDataIntervalId = null;
        console.log('[Widget] Full updates stopped');
    }
}
