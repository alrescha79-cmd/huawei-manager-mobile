import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModemService } from '@/services/modem.service';
import { ThemedAlertHelper, ToastHelper } from '@/components';
import { showInterstitial, showRewarded } from '@/services/ad.service';

interface UseHomeActionsProps {
  modemService: ModemService | null;
  t: (key: string) => string;
  mobileDataStatus: any;
  setMobileDataStatus: (status: any) => void;
  loadData: (service: ModemService) => Promise<void>;
  loadMonthlySettings: (service: ModemService) => Promise<void>;
  setLastClearedDate: (date: string) => void;
  setPreviousTotalTraffic: (traffic: number) => void;
}

export function useHomeActions({
  modemService,
  t,
  mobileDataStatus,
  setMobileDataStatus,
  loadData,
  loadMonthlySettings,
  setLastClearedDate,
  setPreviousTotalTraffic,
}: UseHomeActionsProps) {
  const [isTogglingData, setIsTogglingData] = useState(false);
  const [isChangingIp, setIsChangingIp] = useState(false);
  const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisTitle, setDiagnosisTitle] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<{ label: string; success: boolean; value?: string }[]>([]);
  const [diagnosisSummary, setDiagnosisSummary] = useState('');

  const handleToggleMobileData = async () => {
    if (!modemService || isTogglingData) return;

    const newState = !mobileDataStatus?.isEnabled;

    const performToggle = async () => {
      setIsTogglingData(true);
      try {
        await modemService.toggleMobileData(newState);
        const dataStatus = await modemService.getMobileDataStatus();
        setMobileDataStatus(dataStatus);
        ToastHelper.success(newState ? t('home.dataEnabled') : t('home.dataDisabled'));
        showInterstitial(() => { });
      } catch (error) {
        console.error('Error toggling mobile data:', error);
        ToastHelper.error(t('alerts.failedToggleData'));
      } finally {
        setIsTogglingData(false);
      }
    };

    if (!newState) {
      ThemedAlertHelper.alert(
        t('home.disableData'),
        t('home.confirmDisableData'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), onPress: performToggle },
        ]
      );
    } else {
      performToggle();
    }
  };

  const handleChangeIp = async () => {
    if (!modemService || isChangingIp) return;

    ThemedAlertHelper.alert(
      t('alerts.changeIpTitle'),
      t('alerts.changeIpMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          onPress: () => {
            showRewarded(
              async () => {
                setIsChangingIp(true);

                ToastHelper.info(t('alerts.ipChangeStartedMessage'));

                modemService.triggerPlmnScan().catch((error) => {
                });

                setTimeout(() => {
                  setIsChangingIp(false);
                }, 10000);

                setTimeout(() => {
                  if (modemService) {
                    loadData(modemService);
                  }
                }, 45000);
              },
              () => ToastHelper.warning(t('ads.watchAdToAccess'))
            );
          },
        },
      ]
    );
  };

  const handleDiagnosis = async () => {
    if (!modemService || isRunningDiagnosis) return;

    if (!mobileDataStatus?.isEnabled) {
      ToastHelper.error(t('alerts.mobileDataRequired'));
      return;
    }

    setIsRunningDiagnosis(true);
    try {
      let result = await modemService.diagnosisPing('google.com', 5000);

      if (!result.success) {
        result = await modemService.diagnosisPing('1.1.1.1', 4000);
      }

      setDiagnosisTitle(t('home.diagnosisResult'));
      setDiagnosisResults([
        { label: `Ping ${result.host}`, success: result.success },
      ]);
      setDiagnosisSummary(result.success ? t('home.connectionOk') || 'Connection is working!' : t('home.connectionFailed') || 'Could not reach server');
      setShowDiagnosisModal(true);
    } catch (error: any) {
      console.error('Error running diagnosis ping:', error);
      if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
        ToastHelper.error(t('alerts.networkError'));
      } else {
        ToastHelper.error(t('alerts.diagnosisFailed'));
      }
    } finally {
      setIsRunningDiagnosis(false);
    }
  };

  const handleOneClickCheck = async () => {
    if (!modemService || isRunningCheck) return;

    if (!mobileDataStatus?.isEnabled) {
      ToastHelper.error(t('alerts.mobileDataRequired'));
      return;
    }

    setIsRunningCheck(true);
    try {
      const result = await modemService.oneClickCheck();

      setDiagnosisTitle(t('home.oneClickCheckResult'));
      setDiagnosisResults([
        { label: t('home.internetConnection'), success: result.internetConnection },
        { label: t('home.dnsResolution'), success: result.dnsResolution },
        { label: t('home.status'), success: result.networkStatus === 'Connected', value: result.networkStatus },
        { label: t('home.signalStrength'), success: true, value: result.signalStrength },
      ]);
      setDiagnosisSummary(t(`home.${result.summaryKey}`));
      setShowDiagnosisModal(true);
    } catch (error: any) {
      console.error('Error running one click check:', error);
      if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
        ToastHelper.error(t('alerts.networkError'));
      } else {
        ToastHelper.error(t('alerts.checkFailed'));
      }
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleClearHistory = () => {
    ThemedAlertHelper.alert(
      t('home.clearHistory'),
      t('home.clearHistoryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            if (!modemService) return;
            setIsClearingHistory(true);
            try {
              const success = await modemService.clearTrafficHistory();
              if (success) {
                const now = new Date().toISOString();
                await AsyncStorage.setItem('lastClearedTrafficDate', now);
                setLastClearedDate(now);
                setPreviousTotalTraffic(0);
                await AsyncStorage.setItem('previousTotalTraffic', '0');
                loadData(modemService);
                ToastHelper.success(t('home.historyClearedSuccess'));
              } else {
                ToastHelper.error(t('home.clearHistoryFailed'));
              }
            } catch (error) {
              ToastHelper.error(t('home.clearHistoryFailed'));
            } finally {
              setIsClearingHistory(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveMonthlySettings = async (settings: {
    enabled: boolean;
    startDay: number;
    dataLimit: number;
    dataLimitUnit: 'MB' | 'GB';
    monthThreshold: number;
  }) => {
    if (!modemService) return;

    try {
      await modemService.setMonthlyDataSettings(settings);
      ToastHelper.success(t('home.monthlySettingsSaved'));
      loadMonthlySettings(modemService);
    } catch (error) {
      ToastHelper.error(t('home.failedSaveMonthlySettings'));
      throw error;
    }
  };

  return {
    isTogglingData,
    isChangingIp,
    isRunningDiagnosis,
    isRunningCheck,
    isClearingHistory,
    showDiagnosisModal,
    setShowDiagnosisModal,
    diagnosisTitle,
    diagnosisResults,
    diagnosisSummary,
    handleToggleMobileData,
    handleChangeIp,
    handleDiagnosis,
    handleOneClickCheck,
    handleClearHistory,
    handleSaveMonthlySettings,
  };
}
