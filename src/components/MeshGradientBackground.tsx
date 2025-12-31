import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { useTheme } from '@/theme';

interface MeshGradientBackgroundProps {
    children: React.ReactNode;
    style?: any;
}

const { width, height } = Dimensions.get('window');

export const MeshGradientBackground = ({ children, style }: MeshGradientBackgroundProps) => {
    const { colors, isDark } = useTheme();

    // Define mesh gradient colors based on theme
    const meshColors = isDark
        ? {
            base: '#0D0D18',
            blob1: '#1A1A3E',  // Purple blob
            blob2: '#0A84FF',  // Primary blue blob
            blob3: '#2D1B4E',  // Deep purple blob
            blob4: '#16213E',  // Navy blob
        }
        : {
            base: '#E8E8F0',
            blob1: '#C8D4F0',  // Light blue blob
            blob2: '#E0D0F8',  // Light purple blob
            blob3: '#D8E8F0',  // Soft cyan blob
            blob4: '#F0E8F8',  // Very light purple blob
        };

    return (
        <View style={[styles.container, style]}>
            {/* Base gradient layer */}
            <LinearGradient
                colors={colors.backgroundGradient as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Mesh blobs using SVG radial gradients */}
            <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
                <Defs>
                    {/* Top-left blob */}
                    <RadialGradient id="blob1" cx="20%" cy="15%" rx="50%" ry="40%">
                        <Stop offset="0%" stopColor={meshColors.blob1} stopOpacity={isDark ? 0.6 : 0.4} />
                        <Stop offset="100%" stopColor={meshColors.blob1} stopOpacity="0" />
                    </RadialGradient>

                    {/* Top-right blob */}
                    <RadialGradient id="blob2" cx="85%" cy="10%" rx="40%" ry="35%">
                        <Stop offset="0%" stopColor={meshColors.blob2} stopOpacity={isDark ? 0.25 : 0.15} />
                        <Stop offset="100%" stopColor={meshColors.blob2} stopOpacity="0" />
                    </RadialGradient>

                    {/* Center blob */}
                    <RadialGradient id="blob3" cx="60%" cy="45%" rx="45%" ry="40%">
                        <Stop offset="0%" stopColor={meshColors.blob3} stopOpacity={isDark ? 0.5 : 0.3} />
                        <Stop offset="100%" stopColor={meshColors.blob3} stopOpacity="0" />
                    </RadialGradient>

                    {/* Bottom-left blob */}
                    <RadialGradient id="blob4" cx="10%" cy="80%" rx="50%" ry="45%">
                        <Stop offset="0%" stopColor={meshColors.blob4} stopOpacity={isDark ? 0.5 : 0.35} />
                        <Stop offset="100%" stopColor={meshColors.blob4} stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Render blobs */}
                <Ellipse cx={width * 0.2} cy={height * 0.15} rx={width * 0.6} ry={height * 0.4} fill="url(#blob1)" />
                <Ellipse cx={width * 0.85} cy={height * 0.1} rx={width * 0.5} ry={height * 0.35} fill="url(#blob2)" />
                <Ellipse cx={width * 0.6} cy={height * 0.45} rx={width * 0.55} ry={height * 0.4} fill="url(#blob3)" />
                <Ellipse cx={width * 0.1} cy={height * 0.8} rx={width * 0.6} ry={height * 0.45} fill="url(#blob4)" />
            </Svg>

            {/* Content */}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default MeshGradientBackground;
