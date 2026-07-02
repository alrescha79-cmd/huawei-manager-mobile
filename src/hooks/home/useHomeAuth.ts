import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ModemService } from '@/services/modem.service';
import { ThemedAlertHelper } from '@/components';

interface UseHomeAuthProps {
  credentials: any;
  logout: () => Promise<void>;
  login: (creds: any) => Promise<any>;
  sessionExpired: boolean;
  setRelogging: (val: boolean) => void;
  clearSessionExpired: () => void;
  tryQuietSessionRestore: () => Promise<{ success: boolean; error?: "unreachable" | "auth_failed" }>;
  modemService: ModemService | null;
  t: (key: string) => string;
  loadData: (service: ModemService) => Promise<void>;
  loadBands: (service: ModemService) => Promise<void>;
}

export function useHomeAuth({
  credentials,
  logout,
  login,
  sessionExpired,
  setRelogging,
  clearSessionExpired,
  tryQuietSessionRestore,
  modemService,
  t,
  loadData,
  loadBands,
}: UseHomeAuthProps) {
  const router = useRouter();
  const [showReloginWebView, setShowReloginWebView] = useState(false);
  const [isRetryingSilent, setIsRetryingSilent] = useState(false);

  const handleReLogin = () => {
    ThemedAlertHelper.alert(
      t('home.reLogin'),
      t('home.checkLogin'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('home.reLogin'),
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleRetrySilent = async () => {
    if (isRetryingSilent) return;
    setIsRetryingSilent(true);

    let success = false;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[Home] Silent login attempt ${attempt}/${maxAttempts}...`);
      try {
        const restored = await tryQuietSessionRestore();
        if (restored.success) {
          success = true;
          if (modemService) {
            loadData(modemService);
            loadBands(modemService);
          }
          break;
        }
      } catch (error) {
        console.error(`[Home] Silent login attempt ${attempt} failed:`, error);
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsRetryingSilent(false);

    if (!success) {
      ThemedAlertHelper.alert(
        t('alerts.sessionExpired'),
        t('alerts.silentLoginFailed'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.goToLogin'),
            onPress: async () => {
              await logout();
              router.replace('/login');
            },
          },
        ]
      );
    }
  };

  const handleReloginSuccess = async () => {
    setShowReloginWebView(false);
    setRelogging(false);
    clearSessionExpired();

    if (credentials) {
      await login({
        modemIp: credentials.modemIp,
        username: credentials.username,
        password: credentials.password,
      });
    }

    if (modemService) {
      loadData(modemService);
    }
  };

  return {
    showReloginWebView,
    setShowReloginWebView,
    isRetryingSilent,
    handleReLogin,
    handleRetrySilent,
    handleReloginSuccess,
  };
}
