import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ModemStatusWidget, ErrorWidget } from './ModemStatusWidget';
import { fetchWidgetData } from './WidgetDataService';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const widgetInfo = props.widgetInfo;

    const renderWithData = async () => {
        try {
            const data = await Promise.race([
                fetchWidgetData(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                )
            ]) as Awaited<ReturnType<typeof fetchWidgetData>>;

            props.renderWidget(
                <ModemStatusWidget
                    data={data}
                    width={widgetInfo.width}
                    height={widgetInfo.height}
                />
            );
        } catch {
            props.renderWidget(<ErrorWidget message="No connection to modem" />);
        }
    };

    switch (props.widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED':
            await renderWithData();
            break;

        case 'WIDGET_CLICK':
            if (props.clickAction === 'REFRESH') {
                await renderWithData();
            }
            break;

        case 'WIDGET_DELETED':
            break;

        default:
            break;
    }
}
