import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget';
import {
    WidgetData,
    formatBytes,
    formatSpeed,
    getNetworkTypeName,
} from './WidgetDataService';

// Color palette
const colors = {
    background: '#0f172a' as ColorProp,
    cardBg: '#1e293b' as ColorProp,
    border: '#334155' as ColorProp,
    textPrimary: '#ffffff' as ColorProp,
    textSecondary: '#94a3b8' as ColorProp,
    textMuted: '#64748b' as ColorProp,
    emerald: '#34d399' as ColorProp,
    emeraldBg: '#064e3b' as ColorProp,
    blue: '#3b82f6' as ColorProp,
    blueBg: '#1e3a5f' as ColorProp,
    orange: '#fb923c' as ColorProp,
    orangeBg: '#7c2d12' as ColorProp,
    yellow: '#fde047' as ColorProp,
    signalActive: '#34d399' as ColorProp,
    signalInactive: '#475569' as ColorProp,
};

interface ModemStatusWidgetProps {
    data: WidgetData;
    width?: number;
    height?: number;
}

// Signal bar component
function SignalBars({ strength }: { strength: number }) {
    const activeBars = Math.min(Math.max(strength, 0), 5);

    return (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', marginRight: 10 }}>
            {[1, 2, 3, 4, 5].map((bar) => (
                <FlexWidget
                    key={bar}
                    style={{
                        width: 5,
                        height: bar * 4,
                        backgroundColor: bar <= activeBars ? colors.signalActive : colors.signalInactive,
                        borderRadius: 2,
                        marginRight: 2,
                    }}
                />
            ))}
        </FlexWidget>
    );
}

// Speed card component - unified look for both download and upload
function SpeedCard({
    icon,
    speed,
    label,
    iconColor,
    iconBg
}: {
    icon: string;
    speed: string;
    label: string;
    iconColor: ColorProp;
    iconBg: ColorProp;
}) {
    return (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <FlexWidget
                style={{
                    backgroundColor: iconBg,
                    padding: 8,
                    borderRadius: 10,
                    marginRight: 12,
                }}
            >
                <TextWidget
                    text={icon}
                    style={{
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: iconColor,
                    }}
                />
            </FlexWidget>
            <FlexWidget style={{ flexDirection: 'column' }}>
                <TextWidget
                    text={speed}
                    style={{
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: colors.textPrimary,
                    }}
                />
                <TextWidget
                    text={label}
                    style={{
                        fontSize: 10,
                        color: colors.textMuted,
                        marginTop: 2,
                    }}
                />
            </FlexWidget>
        </FlexWidget>
    );
}

// Usage stat row component
function UsageRow({
    icon,
    label,
    value,
    valueColor
}: {
    icon: string;
    label: string;
    value: string;
    valueColor: ColorProp;
}) {
    return (
        <FlexWidget
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: 'match_parent',
                marginBottom: 10,
            }}
        >
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <TextWidget
                    text={icon}
                    style={{ fontSize: 10, marginRight: 8, color: colors.textMuted }}
                />
                <TextWidget
                    text={label}
                    style={{ fontSize: 11, color: colors.textMuted }}
                />
            </FlexWidget>
            <TextWidget
                text={value}
                style={{ fontSize: 12, fontWeight: 'bold', color: valueColor }}
            />
        </FlexWidget>
    );
}

// Main widget component
export function ModemStatusWidget({ data }: ModemStatusWidgetProps) {
    const isConnected = data.connectionStatus === '901';
    const networkType = getNetworkTypeName(data.networkType);
    const signalStrength = parseInt(data.signalStrength || '0', 10);

    const sessionTotal = data.currentDownload + data.currentUpload;
    const monthTotal = data.monthDownload + data.monthUpload;
    const total = data.totalDownload + data.totalUpload;

    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: colors.background,
                borderRadius: 24,
                padding: 16,
                flexDirection: 'column',
            }}
        >
            {/* Header Row */}
            <FlexWidget
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    width: 'match_parent',
                }}
            >
                {/* Left: Signal + Network */}
                <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SignalBars strength={signalStrength} />
                    <TextWidget
                        text={networkType}
                        style={{
                            fontSize: 13,
                            fontWeight: 'bold',
                            color: colors.textPrimary,
                        }}
                    />
                </FlexWidget>

                {/* Center: Status Badge */}
                <FlexWidget
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.emeraldBg,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 12,
                    }}
                >
                    <TextWidget
                        text="●"
                        style={{
                            fontSize: 8,
                            color: isConnected ? colors.emerald : colors.orange,
                            marginRight: 5,
                        }}
                    />
                    <TextWidget
                        text={isConnected ? 'Connected' : 'Offline'}
                        style={{
                            fontSize: 10,
                            fontWeight: 'bold',
                            color: isConnected ? colors.emerald : colors.orange,
                        }}
                    />
                </FlexWidget>

                {/* Right: Refresh Icon */}
                <FlexWidget
                    style={{ paddingLeft: 12 }}
                    clickAction="REFRESH"
                    clickActionData={{ action: 'refresh' }}
                >
                    <TextWidget
                        text="⟳"
                        style={{ fontSize: 20, color: colors.textSecondary }}
                    />
                </FlexWidget>
            </FlexWidget>

            {/* Main Content: 2-Column Grid */}
            <FlexWidget
                style={{
                    flexDirection: 'row',
                    flex: 1,
                    width: 'match_parent',
                }}
            >
                {/* Left Column: Speed - Both with same style */}
                <FlexWidget
                    style={{
                        flex: 1,
                        flexDirection: 'column',
                        justifyContent: 'center',
                        borderRightWidth: 1,
                        borderColor: colors.border,
                        paddingRight: 16,
                    }}
                >
                    {/* Download Speed */}
                    <SpeedCard
                        icon="↓"
                        speed={formatSpeed(data.currentDownloadRate)}
                        label="Download"
                        iconColor={colors.blue}
                        iconBg={colors.blueBg}
                    />

                    {/* Upload Speed - Same style as Download */}
                    <SpeedCard
                        icon="↑"
                        speed={formatSpeed(data.currentUploadRate)}
                        label="Upload"
                        iconColor={colors.orange}
                        iconBg={colors.orangeBg}
                    />
                </FlexWidget>

                {/* Right Column: Usage Stats */}
                <FlexWidget
                    style={{
                        flex: 1,
                        flexDirection: 'column',
                        justifyContent: 'center',
                        paddingLeft: 16,
                    }}
                >
                    <UsageRow
                        icon="◷"
                        label="Session"
                        value={formatBytes(sessionTotal)}
                        valueColor={colors.textPrimary}
                    />
                    <UsageRow
                        icon="◐"
                        label="Daily"
                        value={formatBytes(data.dayUsed)}
                        valueColor={colors.orange}
                    />
                    <UsageRow
                        icon="▦"
                        label="Monthly"
                        value={formatBytes(monthTotal)}
                        valueColor={colors.yellow}
                    />

                    {/* Progress Bar - show monthly usage percentage */}
                    <FlexWidget
                        style={{
                            height: 6,
                            backgroundColor: colors.cardBg,
                            borderRadius: 3,
                            marginTop: 6,
                            width: 'match_parent',
                        }}
                    >
                        <FlexWidget
                            style={{
                                width: `${Math.min((monthTotal / (50 * 1024 * 1024 * 1024)) * 100, 100)}%`,
                                height: 6,
                                backgroundColor: monthTotal > 40 * 1024 * 1024 * 1024 ? colors.orange : colors.blue,
                                borderRadius: 3,
                            }}
                        />
                    </FlexWidget>
                </FlexWidget>
            </FlexWidget>
        </FlexWidget>
    );
}

// Loading state widget
export function LoadingWidget() {
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: colors.background,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <TextWidget text="◌" style={{ fontSize: 40, color: colors.blue, marginBottom: 8 }} />
            <TextWidget text="Loading..." style={{ fontSize: 14, color: colors.textSecondary }} />
        </FlexWidget>
    );
}

// Error state widget
export function ErrorWidget({ message }: { message: string }) {
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: colors.background,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 16,
            }}
        >
            <TextWidget text="⚠" style={{ fontSize: 32, color: colors.orange, marginBottom: 10 }} />
            <TextWidget text={message} style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }} />
            <TextWidget text="Tap to retry" style={{ fontSize: 10, color: colors.textMuted, marginTop: 10 }} />
        </FlexWidget>
    );
}
