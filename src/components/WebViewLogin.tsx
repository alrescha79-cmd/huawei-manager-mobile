import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { ThemedAlertHelper } from './ThemedAlert';

interface WebViewLoginProps {
    modemIp: string;
    username?: string;
    password?: string;
    visible: boolean;
    hidden?: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
    onTimeout?: () => void;
}

const LOGIN_TIMEOUT_MS = 30000;
const MAX_RETRY_ATTEMPTS = 3;

export function WebViewLogin({
    modemIp,
    username,
    password,
    visible,
    hidden = false,
    onClose,
    onLoginSuccess,
    onTimeout,
}: WebViewLoginProps) {
    const { colors, typography, spacing } = useTheme();
    const { t } = useTranslation();
    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [loginDetected, setLoginDetected] = useState(false);
    const [autoFillAttempted, setAutoFillAttempted] = useState(false);

    const [isTimedOut, setIsTimedOut] = useState(false);
    const [retryAttempts, setRetryAttempts] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loginUrl = `http://${modemIp}/html/index.html`;

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (visible && hidden && !loginDetected && !isTimedOut) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setIsTimedOut(true);
            }, LOGIN_TIMEOUT_MS);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [visible, hidden, loginDetected, isTimedOut, retryAttempts]);

    useEffect(() => {
        if (!visible) {
            setIsTimedOut(false);
            setAutoFillAttempted(false);
            setLoginDetected(false);
            setRetryAttempts(0);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
    }, [visible]);

    const handleRetry = useCallback(() => {
        if (retryAttempts >= MAX_RETRY_ATTEMPTS - 1) {
            onTimeout?.();
            onClose();
            return;
        }

        setRetryAttempts(prev => prev + 1);
        setIsTimedOut(false);
        setAutoFillAttempted(false);

        if (webViewRef.current) {
            webViewRef.current.reload();
        }
    }, [retryAttempts, onTimeout, onClose]);

    const handleLoginManually = useCallback(() => {
        onTimeout?.();
        onClose();
    }, [onTimeout, onClose]);

    const autoFillJs = username && password ? `
    (function() {
      // Wait for page to load
      setTimeout(function() {
        // Find username field
        var usernameInput = document.querySelector('input[name="Username"]') ||
                           document.querySelector('input[name="username"]') ||
                           document.querySelector('#username') ||
                           document.querySelector('input[type="text"]');
        
        // Find password field
        var passwordInput = document.querySelector('input[name="Password"]') ||
                           document.querySelector('input[name="password"]') ||
                           document.querySelector('#password') ||
                           document.querySelector('input[type="password"]');
        
        if (usernameInput && passwordInput) {
          usernameInput.value = '${username}';
          passwordInput.value = '${password}';
          
          // Trigger input events
          usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Find and click login button after a short delay
          setTimeout(function() {
            var loginBtn = document.querySelector('input[type="submit"]') ||
                          document.querySelector('button[type="submit"]') ||
                          document.querySelector('#login_btn') ||
                          document.querySelector('.login-btn') ||
                          document.querySelector('button');
            
            if (loginBtn) {
              loginBtn.click();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'AUTO_LOGIN_ATTEMPTED'
              }));
            }
          }, 500);
        }
      }, 1500);
      return true;
    })();
    ` : '';

    const injectedJs = `
    (function() {
      // Function to check login status
      function checkLoginStatus() {
        // Try to find elements that indicate logged in state
        var logoutLink = document.querySelector('[onclick*="logout"]') || 
                         document.querySelector('.logout') ||
                         document.querySelector('#logout');
        
        // Check if we're on the main dashboard (after login)
        var dashboard = document.querySelector('.dashboard') ||
                        document.querySelector('#content') ||
                        document.querySelector('.main-content');
        
        // Check URL for home/index after login
        var isLoggedIn = window.location.href.includes('home.html') ||
                         window.location.href.includes('content.html') ||
                         (dashboard && logoutLink);
        
        if (isLoggedIn) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOGIN_SUCCESS',
            url: window.location.href
          }));
        }
        
        // Also check for login error
        var errorElement = document.querySelector('.error-message') ||
                          document.querySelector('.login-error');
        if (errorElement && errorElement.textContent) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOGIN_ERROR',
            message: errorElement.textContent
          }));
        }
      }
      
      // Check on page load and after short delay
      setTimeout(checkLoginStatus, 1000);
      
      // Also observe for DOM changes
      var observer = new MutationObserver(function() {
        setTimeout(checkLoginStatus, 500);
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      
      return true;
    })();
  `;

    const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);

            if (message.type === 'LOGIN_SUCCESS') {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                setLoginDetected(true);

                setTimeout(() => {
                    onLoginSuccess();
                }, 500);
            } else if (message.type === 'LOGIN_ERROR') {
                ThemedAlertHelper.alert(t('webViewLogin.loginFailed'), message.message || t('webViewLogin.checkCredentials'));
            }
        } catch (error) {
        }
    }, [onLoginSuccess]);

    const handleNavigationChange = useCallback((navState: WebViewNavigation) => {

        if (navState.url.includes('home.html') ||
            navState.url.includes('content.html') ||
            navState.url.includes('index.html#home')) {

            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(injectedJs);
            }
        }
    }, [injectedJs]);

    const handleClose = () => {
        if (!loginDetected) {
            ThemedAlertHelper.alert(
                t('webViewLogin.cancelLogin'),
                t('webViewLogin.cancelConfirm'),
                [
                    { text: t('common.no'), style: 'cancel' },
                    { text: t('common.yes'), onPress: onClose },
                ]
            );
        } else {
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType={hidden ? "fade" : "slide"}
            presentationStyle={hidden ? "overFullScreen" : "fullScreen"}
            transparent={hidden}
            onRequestClose={handleClose}
        >
            {hidden ? (
                <View style={[styles.hiddenContainer, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                    <View style={[styles.hiddenContent, { backgroundColor: colors.card }]}>
                        {isTimedOut ? (
                            <>
                                <Text style={[typography.headline, { color: colors.error, marginBottom: spacing.sm, textAlign: 'center' }]}>
                                    ⏱ {t('webViewLogin.loginTimeout')}
                                </Text>
                                <Text style={[typography.body, { color: colors.text, marginBottom: spacing.md, textAlign: 'center' }]}>
                                    {t('webViewLogin.timeoutMessage')}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }]}>
                                    {t('webViewLogin.attempt')} {retryAttempts + 1}/{MAX_RETRY_ATTEMPTS}
                                </Text>

                                <TouchableOpacity
                                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                                    onPress={handleRetry}
                                >
                                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                                        {t('webViewLogin.tryAgain')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.manualButton, { borderColor: colors.border }]}
                                    onPress={handleLoginManually}
                                >
                                    <Text style={[typography.body, { color: colors.text }]}>
                                        {t('webViewLogin.loginManually')}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[typography.body, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
                                    {t('webViewLogin.loggingIn')}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                                    {t('webViewLogin.pleaseWait')}
                                </Text>
                            </>
                        )}
                    </View>

                    {!isTimedOut && (
                        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
                            <WebView
                                ref={webViewRef}
                                source={{ uri: loginUrl }}
                                onMessage={handleMessage}
                                onNavigationStateChange={handleNavigationChange}
                                onLoadStart={() => setLoading(true)}
                                onLoadEnd={() => {
                                    setLoading(false);
                                    if (webViewRef.current) {
                                        webViewRef.current.injectJavaScript(injectedJs);
                                        if (autoFillJs && !autoFillAttempted) {
                                            webViewRef.current.injectJavaScript(autoFillJs);
                                            setAutoFillAttempted(true);
                                        }
                                    }
                                }}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                sharedCookiesEnabled={true}
                                thirdPartyCookiesEnabled={true}
                                cacheEnabled={true}
                                incognito={false}
                            />
                        </View>
                    )}
                </View>
            ) : (
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={[styles.header, {
                        backgroundColor: colors.card,
                        borderBottomColor: colors.border,
                        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 12
                    }]}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={[typography.body, { color: colors.primary }]}>{t('common.cancel')}</Text>
                        </TouchableOpacity>

                        <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>
                            {t('webViewLogin.title')}
                        </Text>

                        <View style={styles.closeButton} />
                    </View>

                    <View style={[styles.instructions, { backgroundColor: colors.card }]}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
                            {t('webViewLogin.instructions')}
                        </Text>
                    </View>

                    <WebView
                        ref={webViewRef}
                        source={{ uri: loginUrl }}
                        style={styles.webview}
                        onMessage={handleMessage}
                        onNavigationStateChange={handleNavigationChange}
                        onLoadStart={() => setLoading(true)}
                        onLoadEnd={() => {
                            setLoading(false);
                            if (webViewRef.current) {
                                webViewRef.current.injectJavaScript(injectedJs);
                                if (autoFillJs && !autoFillAttempted) {
                                    webViewRef.current.injectJavaScript(autoFillJs);
                                    setAutoFillAttempted(true);
                                }
                            }
                        }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        sharedCookiesEnabled={true}
                        thirdPartyCookiesEnabled={true}
                        cacheEnabled={true}
                        incognito={false}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                                    {t('webViewLogin.loadingModem')}
                                </Text>
                            </View>
                        )}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('[WebViewLogin] WebView error:', nativeEvent);
                            ThemedAlertHelper.alert(
                                t('webViewLogin.connectionError'),
                                t('webViewLogin.connectionErrorMessage'),
                                [{ text: t('common.ok'), onPress: onClose }]
                            );
                        }}
                    />

                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}

                    {loginDetected && (
                        <View style={[styles.successOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                            <Text style={[typography.title2, { color: '#fff', marginBottom: spacing.md }]}>
                                ✓ {t('webViewLogin.loginSuccess')}
                            </Text>
                            <Text style={[typography.body, { color: '#fff' }]}>
                                {t('webViewLogin.redirecting')}
                            </Text>
                        </View>
                    )}
                </View>
            )
            }
        </Modal >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    closeButton: {
        width: 60,
    },
    instructions: {
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hiddenContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hiddenContent: {
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: 250,
    },
    retryButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
        marginBottom: 12,
        minWidth: 180,
        alignItems: 'center',
    },
    manualButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
        borderWidth: 1,
        minWidth: 180,
        alignItems: 'center',
    },
});

export default WebViewLogin;

