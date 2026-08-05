import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/types';
import { userProfileService, UserProfile } from '../services/userProfileService';
import { uploadImageToFirebase } from '../services/firebaseStorage';
import { getCurrentUserId } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user: authUser, requestEmailChange, canChangeEmail } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [styleTagsText, setStyleTagsText] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  /** Which provider owns this account's email, for accounts that cannot change it here. */
  const providerLabel =
    authUser?.providerData?.some(p =>p.providerId === 'google.com')
      ? 'Google'
      : authUser?.providerData?.some(p =>p.providerId === 'apple.com')
      ? 'Apple'
      : 'your sign-in provider';

  const handleEmailChange = async () => {
    setChangingEmail(true);
    try {
      await requestEmailChange(newEmail, currentPassword);
      // Deliberately not a "changed" message: nothing has changed yet, and
      // saying so would leave the user believing they can sign in with the new
      // address immediately.
      setEmailSent(true);
      setCurrentPassword('');
      showToast('Confirmation link sent', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Could not change your email', 'error');
    } finally {
      setChangingEmail(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await userProfileService.getUserProfile(getCurrentUserId(), authUser ? {
        displayName: authUser.displayName,
        email: authUser.email,
        photoURL: authUser.photoURL,
      } : undefined);
      if (profile) {
        setProfileImageUrl(profile.profileImageUrl);
        setDisplayName(profile.displayName);
        setUsername(profile.username);
        setBio(profile.bio || '');
        setLocation(profile.location || '');
        setStyleTagsText(profile.styleTags.join(', '));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setSaving(true);
        const base64 = await readAsStringAsync(result.assets[0].uri, { encoding: 'base64' });
        const url = await uploadImageToFirebase(`data:image/jpeg;base64,${base64}`, getCurrentUserId());
        setProfileImageUrl(url);
      } catch (error) {
        console.error('Error uploading photo:', error);
        showToast('Failed to upload photo', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!displayName.trim() || !username.trim()) {
      showToast('Name and username are required', 'error');
      return;
    }

    try {
      setSaving(true);
      await userProfileService.updateProfile(getCurrentUserId(), {
        displayName: displayName.trim(),
        username: username.trim().replace(/^@/, ''),
        // Empty string, not undefined. Clearing a bio is a real edit and has to
        // persist; undefined would either be rejected by Firestore or, with
        // undefined-stripping on, silently leave the old value in place.
        bio: bio.trim(),
        location: location.trim(),
        ...(profileImageUrl ? { profileImageUrl } : {}),
        styleTags: styleTagsText
          .split(',')
          .map(t =>t.trim())
          .filter(Boolean),
      });
      showToast('Profile updated!', 'success');
      setTimeout(() =>navigation.goBack(), 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleChangePhoto}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{displayName.charAt(0) || '?'}</Text>
              </View>
            )}
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={colors.inkFaint} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" placeholderTextColor={colors.inkFaint} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about your style..."
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.inkFaint}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="City, State" placeholderTextColor={colors.inkFaint} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Style Tags (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={styleTagsText}
            onChangeText={setStyleTagsText}
            placeholder="minimalist, modern, chic"
            placeholderTextColor={colors.inkFaint}
          />
        </View>

        {/* Email is kept separate from the Save button on purpose. It is not a
            profile field - it is the credential you sign in with - and it
            changes through a different, verified flow. Folding it into Save
            would imply it takes effect at the same moment, which it does not. */}
        <View style={styles.emailSection}>
          <Text style={styles.emailSectionTitle}>Sign-in email</Text>
          <Text style={styles.currentEmail}>{authUser?.email || '—'}</Text>

          {!canChangeEmail ? (
            <Text style={styles.emailHelp}>You sign in with {providerLabel}, so your email is managed there. Change it with{' '}
              {providerLabel} and it will update here too.
            </Text>
          ) : emailSent ? (
            <Text style={styles.emailHelp}>Check {newEmail.trim()} for a confirmation link. Your email changes once you open
              it — until then you still sign in with your current address.
            </Text>
          ) : (
            <>
              <Text style={styles.emailHelp}>We'll send a confirmation link to the new address. Your email only changes once
                you open it.
              </Text>

              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="New email address"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={colors.inkFaint}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[
                  styles.emailButton,
                  (!newEmail.trim() || !currentPassword || changingEmail) && styles.emailButtonDisabled,
                ]}
                onPress={handleEmailChange}
                disabled={!newEmail.trim() || !currentPassword || changingEmail}
              >
                <Text style={styles.emailButtonText}>
                  {changingEmail ? 'Sending…' : 'Send confirmation link'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  cancelButton: { fontSize: 16, color: colors.inkMuted },
  title: { fontSize: 18, fontFamily: fonts.sansSemiBold, color: colors.ink },
  saveButton: { fontSize: 16, fontFamily: fonts.sansSemiBold, color: colors.ink },
  saveButtonDisabled: { color: colors.hair },
  content: { flex: 1 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.paper },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 36, fontFamily: fonts.sansSemiBold, color: colors.white },
  changePhotoText: { textAlign: 'center', marginTop: 8, fontSize: 14, color: colors.ink, fontFamily: fonts.sansSemiBold },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  emailSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    marginTop: 12,
    marginBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  emailSectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 8,
  },
  currentEmail: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  emailHelp: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    marginTop: 8,
    marginBottom: 14,
  },
  emailButton: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  emailButtonDisabled: { opacity: 0.4 },
  emailButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.bone,
  },
  label: { fontSize: 14, fontFamily: fonts.sansSemiBold, color: colors.ink, marginBottom: 8 },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: 12,
    fontSize: 16,
    color: colors.ink,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
});
