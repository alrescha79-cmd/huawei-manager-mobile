import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);

// Firebase Messaging background handler must be registered before expo-router
// ponytail: minimal handler, upgrade to full notification display if needed
try {
    const messaging = require('@react-native-firebase/messaging').default;
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('FCM background message:', remoteMessage);
    });
} catch (e) {
    console.log('Firebase messaging not available:', e);
}

// eslint-disable-next-line import/first
import 'expo-router/entry';
