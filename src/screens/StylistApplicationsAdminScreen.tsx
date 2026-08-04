import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { StylistApplication } from '../services/stylistApplicationService';

const listApplicationsFn = httpsCallable(functions, 'listStylistApplications');
const reviewApplicationFn = httpsCallable(functions, 'reviewStylistApplication');

/**
 * Admin review queue.
 *
 * Access is enforced server-side: both Cloud Functions check the caller's uid
 * against an allowlist. This screen being reachable proves nothing - a
 * non-admin who navigates here gets permission-denied and the explanation
 * below, which is the correct place for that check to live.
 */
export default function StylistApplicationsAdminScreen() {
  const [applications, setApplications] = useState<StylistApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listApplicationsFn({ status: 'pending' });
      setApplications(((result.data as any).applications || []) as StylistApplication[]);
      setDenied(false);
    } catch (error: any) {
      if (error?.code === 'functions/permission-denied' || error?.code === 'permission-denied') {
        setDenied(true);
      } else {
        console.error('Error loading applications:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const review = async (application: StylistApplication, decision: 'approve' | 'decline') => {
    const note = notes[application.id]?.trim() || '';

    if (decision === 'decline' && !note) {
      Alert.alert(
        'Add a reason',
        'A declined applicant sees this note. Turning someone down without one is worse than not replying.'
      );
      return;
    }

    setBusyId(application.id);
    try {
      await reviewApplicationFn({ applicationId: application.id, decision, reviewNote: note });
      setApplications(prev => prev.filter(a => a.id !== application.id));
    } catch (error: any) {
      Alert.alert('Could not save that', error?.message || 'Please try again.');
    } finally {
      setBusyId(null);
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

  if (denied) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Not your queue</Text>
          <Text style={styles.subtitle}>
            Reviewing stylist applications is limited to Styled admins.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>ADMIN</Text>
        <Text style={styles.title}>Stylist applications</Text>
        <Text style={styles.subtitle}>
          {applications.length === 0
            ? 'Nothing waiting.'
            : `${applications.length} waiting on a decision.`}
        </Text>

        {applications.map(application => (
          <View key={application.id} style={styles.card}>
            <Text style={styles.name}>{application.fullName}</Text>
            <Text style={styles.meta}>
              {application.yearsExperience} yrs · ${application.hourlyRate}/hr
              {application.location ? ` · ${application.location}` : ''}
            </Text>
            <Text style={styles.email}>{application.email}</Text>

            <Text style={styles.blockLabel}>BIO</Text>
            <Text style={styles.body}>{application.bio}</Text>

            <Text style={styles.blockLabel}>WHY STYLED</Text>
            <Text style={styles.body}>{application.statement}</Text>

            {application.specialties?.length > 0 && (
              <>
                <Text style={styles.blockLabel}>SPECIALTIES</Text>
                <Text style={styles.body}>{application.specialties.join(' · ')}</Text>
              </>
            )}

            {application.sessionTypes?.length > 0 && (
              <>
                <Text style={styles.blockLabel}>SESSIONS</Text>
                <Text style={styles.body}>
                  {application.sessionTypes.map(s => s.replace('-', ' ')).join(' · ')}
                </Text>
              </>
            )}

            {application.portfolioUrls?.length > 0 && (
              <>
                <Text style={styles.blockLabel}>WORK</Text>
                {application.portfolioUrls.map(url => (
                  <TouchableOpacity key={url} onPress={() => Linking.openURL(url).catch(() => {})}>
                    <Text style={styles.link} numberOfLines={1}>
                      {url}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TextInput
              style={styles.noteInput}
              value={notes[application.id] || ''}
              onChangeText={text => setNotes(prev => ({ ...prev, [application.id]: text }))}
              placeholder="Note to the applicant (required to decline)"
              placeholderTextColor={colors.inkFaint}
              multiline
            />

            <Button
              title={busyId === application.id ? 'Working…' : 'Approve'}
              onPress={() => review(application, 'approve')}
              fullWidth
              disabled={busyId === application.id}
              style={{ marginTop: spacing.md }}
            />
            <Button
              title="Decline"
              variant="secondary"
              onPress={() => review(application, 'decline')}
              fullWidth
              disabled={busyId === application.id}
              style={{ marginTop: spacing.xs }}
            />
          </View>
        ))}
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
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.lg,
  },
  name: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  meta: { ...textType.meta, fontSize: 12, marginTop: 4 },
  email: { ...textType.meta, fontSize: 12, color: colors.tobacco },
  blockLabel: { ...textType.microLabel, color: colors.inkFaint, marginTop: spacing.md, marginBottom: 4 },
  body: { ...textType.body, fontSize: 13, color: colors.inkMuted, lineHeight: 20 },
  link: { ...textType.body, fontSize: 13, color: colors.tobacco, marginTop: 2 },

  noteInput: {
    ...textType.body,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: spacing.md,
    minHeight: 64,
    textAlignVertical: 'top',
  },
});
