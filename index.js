// Register widget task handler FIRST - before any other imports
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/WidgetTaskHandler';

// Register the widget task handler immediately
registerWidgetTaskHandler(widgetTaskHandler);

// Then import and execute expo-router entry
import 'expo-router/entry';
