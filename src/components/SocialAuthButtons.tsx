import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme/designSystem';

interface Props {
  onError: (message: string) => void;
  disabled?: boolean;
}

/**
 * Sign-in provider buttons.
 *
 * Apple deliberately uses `AppleAuthenticationButton` from
 * expo-apple-authentication rather than a hand-rolled button. Apple's Human
 * Interface Guidelines require their own button styling, and apps that fake it
 * get rejected - the previous custom version also rendered a private SF Symbol
 * codepoint that shows as a blank box on most devices.
 *
 * Apple's guidelines also require their button to be no less prominent than
 * other sign-in options, which is why it renders first.
 */
export default function SocialAuthButtons({ onError, disabled }: Props) {
  const { signInWithGoogle, signInWithApple, signInWithFacebook, isFacebookConfigured } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [AppleAuth, setAppleAuth] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;

    (async () => {
      try {
        // Lazy require so this component still renders in environments where
        // the native module isn't linked (Expo Go), just without the button.
        const module = require('expo-apple-authentication');
        const available = await module.isAvailableAsync();
        if (!cancelled) {
          setAppleAuth(module);
          setAppleAvailable(available);
        }
      } catch {
        if (!cancelled) setAppleAvailable(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (
    fn: () => Promise<void>,
    setLoading: (v: boolean) => void,
    label: string
  ) => {
    try {
      setLoading(true);
      await fn();
    } catch (error: any) {
      onError(error?.message || `${label} sign-in failed`);
    } finally {
      setLoading(false);
    }
  };

  const busy = disabled || googleLoading || appleLoading || facebookLoading;

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && appleAvailable && AppleAuth && (
        <View style={styles.appleWrap}>
          {appleLoading ? (
            <View style={[styles.button, styles.appleFallback]}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : (
            <AppleAuth.AppleAuthenticationButton
              buttonType={AppleAuth.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuth.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={() => {
                if (busy) return;
                run(signInWithApple, setAppleLoading, 'Apple');
              }}
            />
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, styles.googleButton, busy && styles.buttonDisabled]}
        onPress={() => run(signInWithGoogle, setGoogleLoading, 'Google')}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {googleLoading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      {isFacebookConfigured && (
        <TouchableOpacity
          style={[styles.button, styles.facebookButton, busy && styles.buttonDisabled]}
          onPress={() => run(signInWithFacebook, setFacebookLoading, 'Facebook')}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Continue with Facebook"
        >
          {facebookLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.facebookIcon}>f</Text>
              <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or use email</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginBottom: 12,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  appleWrap: {
    marginBottom: 12,
  },
  appleButton: {
    // Apple's native button needs an explicit height; 52 matches the vertical
    // rhythm of the other buttons (15pt padding + 16pt line height + borders).
    height: 52,
    width: '100%',
  },
  // The three brand colours below (#000000 Apple, #4285F4 Google, #1877F2
  // Facebook) are the only hardcoded hexes left in src/components, and they
  // stay. Apple and Google both publish sign-in button guidelines that
  // constrain the mark and the button ground; restyling them to the app
  // palette would put the build at risk of a guideline rejection. Everything
  // around them - borders, dividers, secondary text - is on the tokens.
  appleFallback: {
    height: 52,
    backgroundColor: '#000000',
    marginBottom: 0,
  },
  googleButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  googleIcon: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: '#4285F4',
  },
  googleButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  facebookIcon: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: colors.white,
  },
  facebookButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hair,
  },
  dividerText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkFaint,
  },
});
