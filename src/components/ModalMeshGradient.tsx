import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { useTheme } from '@/theme';

interface ModalMeshGradientProps {
    style?: any;
}

const { width, height } = Dimensions.get('window');

/**
 * A subtle mesh gradient overlay for modals
 * Should be placed as the first child inside modal container
 */
export const ModalMeshGradient = ({ style }: ModalMeshGradientProps) => {
    const { isDark } = useTheme();

    // Subtle mesh gradient colors for modals (more translucent)
    const meshColors = isDark
        ? {
            blob1: '#2A1A4E',  // Deep purple
            blob2: '#0A84FF',  // Primary blue
            blob3: '#1A1A3E',  // Navy purple
        }
        : {
            blob1: '#D8D0F8',  // Light purple
            blob2: '#C0D8F8',  // Light blue
            blob3: '#E8D8F0',  // Soft lavender
        };

    return (
        <View style={[StyleSheet.absoluteFillObject, style]} pointerEvents="none">
            <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
                <Defs>
                    {/* Top-right blob */}
                    <RadialGradient id="modalBlob1" cx="80%" cy="10%" rx="60%" ry="50%">
                        <Stop offset="0%" stopColor={meshColors.blob1} stopOpacity={isDark ? 0.3 : 0.25} />
                        <Stop offset="100%" stopColor={meshColors.blob1} stopOpacity="0" />
                    </RadialGradient>

                    {/* Center-left blob */}
                    <RadialGradient id="modalBlob2" cx="15%" cy="50%" rx="50%" ry="45%">
                        <Stop offset="0%" stopColor={meshColors.blob2} stopOpacity={isDark ? 0.15 : 0.12} />
                        <Stop offset="100%" stopColor={meshColors.blob2} stopOpacity="0" />
                    </RadialGradient>

                    {/* Bottom blob */}
                    <RadialGradient id="modalBlob3" cx="70%" cy="85%" rx="55%" ry="40%">
                        <Stop offset="0%" stopColor={meshColors.blob3} stopOpacity={isDark ? 0.35 : 0.2} />
                        <Stop offset="100%" stopColor={meshColors.blob3} stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Render blobs */}
                <Ellipse cx="80%" cy="10%" rx="70%" ry="50%" fill="url(#modalBlob1)" />
                <Ellipse cx="15%" cy="50%" rx="60%" ry="55%" fill="url(#modalBlob2)" />
                <Ellipse cx="70%" cy="85%" rx="65%" ry="45%" fill="url(#modalBlob3)" />
            </Svg>
        </View>
    );
};

export default ModalMeshGradient;
