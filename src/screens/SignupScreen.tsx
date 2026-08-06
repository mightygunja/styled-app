import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import SocialAuthButtons from '../components/SocialAuthButtons';
import BackButton from '../components/BackButton';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FieldKey = 'name' | 'email' | 'password' | 'confirm';

export default function SignupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signUp } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<FieldKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const introIn = useRef(new Animated.Value(0)).current;
  const formIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(introIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [introIn, formIn]);

  const rise = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
  });

  const handleSignup = async () => {
    setError(null);

    // Named individually. "Please fill in all fields" against four identical
    // boxes makes the user hunt for which one they missed.
    if (!name.trim()) return setError('Enter your name.');
    if (!email.trim()) return setError('Enter your email address.');
    if (!password) return setError('Choose a password.');
    if (password.length < 6) return setError('Passwords need to be at least 6 characters.');
    if (password !== confirmPassword) return setError('The two passwords do not match.');

    try {
      setLoading(true);
      await signUp(email, password, name);
      // Navigation is handled by the auth state change.
    } catch (err: any) {
      setError(err?.message || 'Could not create the account.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Every field carries a visible label above it.
   *
   * The previous version relied on placeholders alone, with no
   * placeholderTextColor set - so on the pale ground they rendered as faint
   * grey on off-white and the form read as four unlabelled boxes. It was not
   * obvious that one of them was the email.
   */
  const field = (
    key: FieldKey,
    label: string,
    props: React.ComponentProps<typeof TextInput>,
    ref?: React.RefObject<TextInput | null>
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, focused === key && styles.inputFocused]}
        placeholderTextColor={colors.inkFaint}
        onFocus={() => setFocused(key)}
        onBlur={() => setFocused(null)}
        editable={!loading}
        {...props}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={rise(introIn)}>
            <Text style={styles.eyebrow}>CREATE AN ACCOUNT</Text>
            <Text style={styles.title}>Start your closet</Text>
            <Text style={styles.subtitle}>
              Photograph what you own, and the styling works from there.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.form, rise(formIn)]}>
            {/* Into the error box, not a Toast. Toast truncates at two lines and
                these messages now carry instructions. */}
            <SocialAuthButtons disabled={loading} onError={setError} />

            {field('name', 'NAME', {
              placeholder: 'Your name',
              value: name,
              onChangeText: setName,
              autoCapitalize: 'words',
              autoComplete: 'name',
              returnKeyType: 'next',
              onSubmitEditing: () => emailRef.current?.focus(),
            })}

            {field(
              'email',
              'EMAIL',
              {
                placeholder: 'you@example.com',
                value: email,
                onChangeText: setEmail,
                autoCapitalize: 'none',
                autoCorrect: false,
                autoComplete: 'email',
                keyboardType: 'email-address',
                returnKeyType: 'next',
                onSubmitEditing: () => passwordRef.current?.focus(),
              },
              emailRef
            )}

            {field(
              'password',
              'PASSWORD',
              {
                placeholder: 'At least 6 characters',
                value: password,
                onChangeText: setPassword,
                secureTextEntry: true,
                autoComplete: 'new-password',
                returnKeyType: 'next',
                onSubmitEditing: () => confirmRef.current?.focus(),
              },
              passwordRef
            )}

            {field(
              'confirm',
              'CONFIRM PASSWORD',
              {
                placeholder: 'Type it again',
                value: confirmPassword,
                onChangeText: setConfirmPassword,
                secureTextEntry: true,
                autoComplete: 'new-password',
                returnKeyType: 'go',
                onSubmitEditing: handleSignup,
              },
              confirmRef
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkTextBold}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { paddingHorizontal: spacing.page, paddingBottom: 48 },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  form: { marginTop: spacing.lg },
  field: { marginBottom: 14 },
  label: { ...textType.microLabel, fontSize: 9, color: colors.tobacco, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  inputFocused: { borderColor: colors.ink },
  errorBox: {
    backgroundColor: colors.sand,
    padding: 14,
    marginBottom: 10,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },

  button: {
    backgroundColor: colors.ink,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { backgroundColor: colors.hair },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    letterSpacing: 0.4,
    color: colors.white,
  },

  linkButton: { paddingVertical: 14, alignItems: 'center' },
  linkText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  linkTextBold: { fontFamily: fonts.sansMedium, color: colors.ink },
});
