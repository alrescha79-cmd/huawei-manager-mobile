import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/WidgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);

import 'expo-router/entry';
