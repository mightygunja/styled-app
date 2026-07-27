import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onError: (message: string) => void;
  disabled?: boolean;
}

export default function SocialAuthButtons({ onError, disabled }: Props) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      onError(error.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      setAppleLoading(true);
      await signInWithApple();
    } catch (error: any) {
      onError(error.message || 'Apple sign-in failed');
    } finally {
      setAppleLoading(false);
    }
  };

  const busy = disabled || googleLoading || appleLoading;

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.button, styles.appleButton, busy && styles.buttonDisabled]}
          onPress={handleApple}
          disabled={busy}
        >
          {appleLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.appleIcon}>􀣺</Text>
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, styles.googleButton, busy && styles.buttonDisabled]}
        onPress={handleGoogle}
        disabled={busy}
      >
        {googleLoading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

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
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  appleIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  appleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
