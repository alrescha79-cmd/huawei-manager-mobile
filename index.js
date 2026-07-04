import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);

import 'expo-router/entry';
