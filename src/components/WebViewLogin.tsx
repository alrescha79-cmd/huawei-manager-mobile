import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useTheme } from '@/theme';
import { ThemedAlertHelper } from './ThemedAlert';

interface WebViewLoginProps {
    modemIp: string;
    username?: string;
    password?: string;
    visible: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

/**
 * WebView-based login component for Huawei modem.
 * Uses WebView to handle login since React Native cannot send Cookie headers properly.
 */
export function WebViewLogin({
    modemIp,
    username,
    password,
    visible,
    onClose,
    onLoginSuccess,
}: WebViewLoginProps) {
    const { colors, typography, spacing } = useTheme();
    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [loginDetected, setLoginDetected] = useState(false);
    const [autoFillAttempted, setAutoFillAttempted] = useState(false);

    // Huawei modem login page URL
    const loginUrl = `http://${modemIp}/html/index.html`;

    // JavaScript to inject for auto-filling credentials
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

    // JavaScript to inject for detecting login state
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

    // Handle messages from WebView
    const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            console.log('[WebViewLogin] Message from WebView:', message);

            if (message.type === 'LOGIN_SUCCESS') {
                console.log('[WebViewLogin] Login success detected!');
                setLoginDetected(true);

                // Wait a bit to ensure cookies are set, then notify parent
                setTimeout(() => {
                    onLoginSuccess();
                }, 500);
            } else if (message.type === 'LOGIN_ERROR') {
                console.log('[WebViewLogin] Login error:', message.message);
                ThemedAlertHelper.alert('Login Failed', message.message || 'Please check your credentials');
            }
        } catch (error) {
            console.log('[WebViewLogin] Non-JSON message:', event.nativeEvent.data);
        }
    }, [onLoginSuccess]);

    // Handle navigation state changes
    const handleNavigationChange = useCallback((navState: WebViewNavigation) => {
        console.log('[WebViewLogin] Navigation:', navState.url);

        // Check if navigated to a logged-in page
        if (navState.url.includes('home.html') ||
            navState.url.includes('content.html') ||
            navState.url.includes('index.html#home')) {
            console.log('[WebViewLogin] Detected navigation to logged-in page');

            // Inject JS to verify login
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(injectedJs);
            }
        }
    }, [injectedJs]);

    const handleClose = () => {
        if (!loginDetected) {
            ThemedAlertHelper.alert(
                'Cancel Login',
                'Are you sure you want to cancel?',
                [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes', onPress: onClose },
                ]
            );
        } else {
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Text style={[typography.body, { color: colors.primary }]}>Cancel</Text>
                    </TouchableOpacity>

                    <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>
                        Modem Login
                    </Text>

                    <View style={styles.closeButton} />
                </View>

                {/* Instructions */}
                <View style={[styles.instructions, { backgroundColor: colors.card }]}>
                    <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
                        Please login to your modem. The app will detect when login is complete.
                    </Text>
                </View>

                {/* WebView */}
                <WebView
                    ref={webViewRef}
                    source={{ uri: loginUrl }}
                    style={styles.webview}
                    onMessage={handleMessage}
                    onNavigationStateChange={handleNavigationChange}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => {
                        setLoading(false);
                        // Inject detection script
                        if (webViewRef.current) {
                            webViewRef.current.injectJavaScript(injectedJs);
                            // Inject auto-fill script if credentials provided
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
                                Loading modem interface...
                            </Text>
                        </View>
                    )}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('[WebViewLogin] WebView error:', nativeEvent);
                        ThemedAlertHelper.alert(
                            'Connection Error',
                            'Could not connect to modem. Please check your WiFi connection.',
                            [{ text: 'OK', onPress: onClose }]
                        );
                    }}
                />

                {/* Loading overlay */}
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}

                {/* Success overlay */}
                {loginDetected && (
                    <View style={[styles.successOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                        <Text style={[typography.title2, { color: '#fff', marginBottom: spacing.md }]}>
                            ✓ Login Successful!
                        </Text>
                        <Text style={[typography.body, { color: '#fff' }]}>
                            Redirecting...
                        </Text>
                    </View>
                )}
            </View>
        </Modal>
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
});

export default WebViewLogin;
