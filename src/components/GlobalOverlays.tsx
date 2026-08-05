import React from 'react';
import { ThemedAlert } from './ThemedAlert';
import { ToastContainer } from './Toast';
import { UpdateAvailableModal } from './UpdateAvailableModal';
import { ChangelogModal } from './ChangelogModal';
import { SignalBubble } from './SignalBubble';

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertState {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
}

export interface ToastConfig {
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

interface GlobalOverlaysProps {
    alert: AlertState;
    toast: ToastConfig | null;
    showSignalBubble: boolean;
    onAlertDismiss: () => void;
    onToastDismiss: () => void;
    onUpdateDownload: () => void;
}

export const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({
    alert,
    toast,
    showSignalBubble,
    onAlertDismiss,
    onToastDismiss,
    onUpdateDownload,
}) => (
    <>
        <ThemedAlert
            visible={alert.visible}
            title={alert.title}
            message={alert.message}
            buttons={alert.buttons}
            onDismiss={onAlertDismiss}
        />
        <ToastContainer config={toast} onDismiss={onToastDismiss} />
        <UpdateAvailableModal onDownload={onUpdateDownload} />
        <ChangelogModal />
        {showSignalBubble && <SignalBubble />}
    </>
);
