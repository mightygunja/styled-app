import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Chip from '../components/Chip';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { getCurrentUserId } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  stylistApplicationService,
  StylistApplication,
  STYLIST_SPECIALTIES,
  SESSION_TYPE_OPTIONS,
} from '../services/stylistApplicationService';
import { SessionType } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StylistApplicationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<StylistApplication | null>(null);

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [statement, setStatement] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [location, setLocation] = useState('');
  const [certifications, setCertifications] = useState('');
  const [languages, setLanguages] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setExisting(await stylistApplicationService.getMine(getCurrentUserId()));
    } catch (error) {
      console.error('Error loading application:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggle = <T,>(list: T[], value: T, setter: (v: T[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const handleSubmit = async () => {
    const rate = parseFloat(hourlyRate);
    const years = parseInt(yearsExperience, 10);

    if (!fullName.trim() || !bio.trim() || !statement.trim()) {
      Alert.alert('A few things missing', 'Your name, a short bio and your statement are required.');
      return;
    }
    if (specialties.length === 0 || sessionTypes.length === 0) {
      Alert.alert(
        'Tell us what you offer',
        'Pick at least one specialty and one kind of session.'
      );
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Check your rate', 'Enter your hourly rate as a number.');
      return;
    }

    setSubmitting(true);
    try {
      const application = await stylistApplicationService.submit(getCurrentUserId(), {
        fullName: fullName.trim(),
        email: user?.email || '',
        bio: bio.trim(),
        statement: statement.trim(),
        yearsExperience: isNaN(years) ? 0 : years,
        hourlyRate: rate,
        location: location.trim(),
        specialties,
        sessionTypes,
        certifications: certifications.split(',').map(s => s.trim()).filter(Boolean),
        languages: languages.split(',').map(s => s.trim()).filter(Boolean),
        portfolioUrls: portfolio.split('\n').map(s => s.trim()).filter(Boolean),
      });
      setExisting(application);
    } catch (error: any) {
      Alert.alert('Could not submit', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.busyBox}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  // Status view. A declined applicant can reapply, so the form is offered
  // again rather than closing the door - people gain experience.
  if (existing && existing.status !== 'declined') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>YOUR APPLICATION</Text>
          <Text style={styles.title}>
            {existing.status === 'approved' ? "You're a Styled stylist" : 'With our team'}
          </Text>
          <Text style={styles.subtitle}>
            {existing.status === 'approved'
              ? 'Your stylist tools are in your account. Set your availability and clients can start booking you.'
              : 'A person reads every application, so this takes a few days rather than a few minutes. We’ll let you know either way.'}
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>SUBMITTED</Text>
            <Text style={styles.summaryValue}>
              {new Date(existing.submittedAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {existing.status === 'approved' && (
            <Button
              title="Set your availability"
              onPress={() => navigation.navigate('StylistAvailability')}
              fullWidth
              style={{ marginTop: spacing.section }}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>APPLY</Text>
        <Text style={styles.title}>Work as a stylist on Styled</Text>
        <Text style={styles.subtitle}>
          Every stylist is reviewed by a person before they appear in the marketplace. It is the
          reason clients trust the ones who are there.
        </Text>

        {existing?.status === 'declined' && !!existing.reviewNote && (
          <View style={styles.declinedBox}>
            <Text style={styles.declinedLabel}>FROM YOUR LAST APPLICATION</Text>
            <Text style={styles.declinedText}>{existing.reviewNote}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>ABOUT YOU</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full name"
          placeholderTextColor={colors.inkFaint}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Short bio — how you'd introduce yourself to a client"
          placeholderTextColor={colors.inkFaint}
          multiline
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            value={yearsExperience}
            onChangeText={setYearsExperience}
            placeholder="Years styling"
            placeholderTextColor={colors.inkFaint}
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.input, styles.rowInput]}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="Hourly rate ($)"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
          />
        </View>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Where you're based"
          placeholderTextColor={colors.inkFaint}
        />

        <Text style={styles.sectionLabel}>WHAT YOU SPECIALISE IN</Text>
        <View style={styles.chipWrap}>
          {STYLIST_SPECIALTIES.map(s => (
            <Chip
              key={s}
              label={s}
              active={specialties.includes(s)}
              onPress={() => toggle(specialties, s, setSpecialties)}
              style={styles.chipSpacing}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>SESSIONS YOU OFFER</Text>
        <View style={styles.chipWrap}>
          {SESSION_TYPE_OPTIONS.map(s => (
            <Chip
              key={s.value}
              label={s.label}
              active={sessionTypes.includes(s.value)}
              onPress={() => toggle(sessionTypes, s.value, setSessionTypes)}
              style={styles.chipSpacing}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>YOUR WORK</Text>
        <Text style={styles.helper}>
          Links to work we can look at — Instagram, a portfolio site, anything. One per line.
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={portfolio}
          onChangeText={setPortfolio}
          placeholder={'https://instagram.com/yourwork\nhttps://yoursite.com'}
          placeholderTextColor={colors.inkFaint}
          multiline
          autoCapitalize="none"
        />

        <Text style={styles.sectionLabel}>OPTIONAL</Text>
        <TextInput
          style={styles.input}
          value={certifications}
          onChangeText={setCertifications}
          placeholder="Certifications, comma separated"
          placeholderTextColor={colors.inkFaint}
        />
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={languages}
          onChangeText={setLanguages}
          placeholder="Languages, comma separated"
          placeholderTextColor={colors.inkFaint}
        />

        <Text style={styles.sectionLabel}>WHY STYLED</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={statement}
          onChangeText={setStatement}
          placeholder="A few sentences on how you work and who you're best for."
          placeholderTextColor={colors.inkFaint}
          multiline
        />

        <Button
          title={submitting ? 'Sending…' : 'Submit application'}
          onPress={handleSubmit}
          fullWidth
          disabled={submitting}
          style={{ marginTop: spacing.section }}
        />
        <Text style={styles.footnote}>
          We review applications by hand, so expect a few days. You'll hear from us either way.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 100, alignItems: 'center' },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink, lineHeight: 40 },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },
  helper: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginBottom: 10 },

  input: {
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  rowInput: { flex: 1 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipSpacing: { marginBottom: 2 },

  declinedBox: { backgroundColor: colors.sand, padding: spacing.md, marginTop: spacing.lg },
  declinedLabel: { ...textType.microLabel, color: colors.tobacco, marginBottom: 6 },
  declinedText: { ...textType.body, fontSize: 13, color: colors.ink },

  summaryCard: { backgroundColor: colors.paper, padding: spacing.lg, marginTop: spacing.section },
  summaryLabel: { ...textType.microLabel, color: colors.inkFaint, marginBottom: 6 },
  summaryValue: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },

  footnote: { ...textType.meta, fontSize: 11, color: colors.inkFaint, marginTop: spacing.md },
});
