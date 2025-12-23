export { ModemStatusWidget, LoadingWidget, ErrorWidget } from './ModemStatusWidget';
export { widgetTaskHandler } from './WidgetTaskHandler';
export { fetchWidgetData, fetchSpeedData, formatBytes, formatSpeed } from './WidgetDataService';
export { updateModemWidget, startRealtimeWidgetUpdates, stopRealtimeWidgetUpdates } from './WidgetUpdater';
export type { WidgetData, SpeedData } from './WidgetDataService';
