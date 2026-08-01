import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type VideoCallRouteProp = RouteProp<RootStackParamList, 'VideoCall'>;

// Honest placeholder: real video calling needs a WebRTC provider (Twilio,
// Daily.co, Agora) that isn't configured yet, so this doesn't pretend to
// connect a call it can't actually place.
export default function VideoCallScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VideoCallRouteProp>();
  const { sessionId, stylistName } = route.params;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><BackButton /></View>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>VIDEO SESSION</Text>
        <Text style={styles.title}>Video calling isn't set up yet</Text>
        <Text style={styles.body}>
          Your session with {stylistName} is booked, but live video calling needs a video
          provider to be connected first. In the meantime you can view session notes or reach
          out through messages.
        </Text>
        <Button
          title="View session notes"
          onPress={() => navigation.replace('SessionNotes', { sessionId })}
          fullWidth
          style={{ marginTop: spacing.section }}
        />
        <Button
          title="Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
          fullWidth
          style={{ marginTop: 12 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { flex: 1, padding: spacing.page, justifyContent: 'center' },
  eyebrow: { ...textType.eyebrow, marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  body: { ...textType.body, color: colors.inkMuted, marginTop: 16 },
});
