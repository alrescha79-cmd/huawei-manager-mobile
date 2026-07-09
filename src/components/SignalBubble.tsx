import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import { useTheme } from '@/theme';
import { useModemStore } from '@/stores/modem.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSignalIcon,
  getSignalIconFromModemStatus,
  formatBitsPerSecond,
} from '@/utils/helpers';

const BUBBLE_POSITION_KEY = '@signal_bubble_position';
const BUBBLE_SIZE = 80;
const BUBBLE_PADDING = 10;

interface Position {
  x: number;
  y: number;
}

const getSignalColor = (level: number): string => {
  switch (level) {
    case 5: return '#10B981'; // Excellent - Green
    case 4: return '#34D399'; // Good - Light Green
    case 3: return '#F59E0B'; // Fair - Yellow
    case 2: return '#F97316'; // Poor - Orange
    case 1: return '#EF4444'; // Very Poor - Red
    default: return '#6B7280'; // No Signal - Gray
  }
};

export const SignalBubble: React.FC = () => {
  const { colors, isDark } = useTheme();
  
  const { signalInfo, trafficStats, modemStatus } = useModemStore();
  const [position, setPosition] = useState<Position>({ x: 0, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastPosition = useRef<Position>({ x: 0, y: 100 });
  const bubbleScale = useRef(new Animated.Value(1)).current;
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  useEffect(() => {
    const loadPosition = async () => {
      try {
        const saved = await AsyncStorage.getItem(BUBBLE_POSITION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const maxX = screenWidth - BUBBLE_SIZE - BUBBLE_PADDING;
          const maxY = screenHeight - BUBBLE_SIZE - BUBBLE_PADDING - 100;
          
          lastPosition.current = {
            x: Math.max(BUBBLE_PADDING, Math.min(parsed.x, maxX)),
            y: Math.max(BUBBLE_PADDING, Math.min(parsed.y, maxY)),
          };
          setPosition(lastPosition.current);
          translateX.setValue(lastPosition.current.x);
          translateY.setValue(lastPosition.current.y);
        } else {
          const defaultX = screenWidth - BUBBLE_SIZE - BUBBLE_PADDING;
          lastPosition.current = { x: defaultX, y: 100 };
          setPosition(lastPosition.current);
          translateX.setValue(defaultX);
          translateY.setValue(100);
        }
      } catch (e) {
        console.error('Failed to load bubble position:', e);
      }
    };
    loadPosition();
  }, []);
  
  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;
    translateX.setValue(lastPosition.current.x + translationX);
    translateY.setValue(lastPosition.current.y + translationY);
  };
  
  const onGestureStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { state, translationX, translationY } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      setIsDragging(true);
      Animated.spring(bubbleScale, { toValue: 1.1, useNativeDriver: true }).start();
    }
    
    if (state === State.END || state === State.CANCELLED) {
      setIsDragging(false);
      Animated.spring(bubbleScale, { toValue: 1, useNativeDriver: true }).start();
      
      const maxX = screenWidth - BUBBLE_SIZE - BUBBLE_PADDING;
      const maxY = screenHeight - BUBBLE_SIZE - BUBBLE_PADDING - 100;
      
      let finalX = Math.max(BUBBLE_PADDING, Math.min(lastPosition.current.x + translationX, maxX));
      let finalY = Math.max(BUBBLE_PADDING, Math.min(lastPosition.current.y + translationY, maxY));
      
      // Snapping logic
      finalX = finalX < screenWidth / 2 ? BUBBLE_PADDING : maxX;
      
      lastPosition.current = { x: finalX, y: finalY };
      translateX.setValue(finalX);
      translateY.setValue(finalY);
      
      AsyncStorage.setItem(BUBBLE_POSITION_KEY, JSON.stringify(lastPosition.current)).catch(() => {});
    }
  };
  
  const getSignalBars = (): number => {
    const calculatedIcon = getSignalIcon(signalInfo?.rssi, signalInfo?.rsrp);
    if (calculatedIcon > 0) return calculatedIcon;
    
    const signalIconStr = modemStatus?.signalIcon?.toString();
    return getSignalIconFromModemStatus(signalIconStr);
  };
  
  const signalLevel = getSignalBars();
  const signalColor = getSignalColor(signalLevel);
  
  const downloadRate = trafficStats?.currentDownloadRate || 0;
  const uploadRate = trafficStats?.currentUploadRate || 0;
  
  const isConnected = modemStatus?.connectionStatus === '901';
  
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBitsPerSecond(bytesPerSecond * 8);
  };

  const speedDisplay = formatSpeed(downloadRate + uploadRate);
  
  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onGestureStateChange}
    >
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            transform: [
              { translateX },
              { translateY },
              { scale: bubbleScale },
            ],
          },
        ]}
      >
        <View style={styles.content}>
          {/* Signal Bars */}
          <View style={styles.signalBarsContainer}>
            {[1, 2, 3, 4, 5].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.signalBar,
                  {
                    height: bar * 3 + 2,
                    backgroundColor: bar <= signalLevel && isConnected
                      ? signalColor
                      : isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  },
                ]}
              />
            ))}
          </View>
          
          {/* Speed */}
          {isConnected ? (
            <Text style={[styles.speedText, { color: colors.primary }]} numberOfLines={1}>
              {speedDisplay}
            </Text>
          ) : null}
        </View>
        
        {/* Drag indicator */}
        {isDragging && (
          <View style={[styles.dragIndicator, { backgroundColor: colors.primary }]} />
        )}
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  signalBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    marginBottom: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 1,
    marginHorizontal: 1,
  },
  signalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  speedText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  dragIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});