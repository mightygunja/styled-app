/**
 * Settings > Blocked members: everyone this member has blocked, with Unblock.
 *
 * Blocking hides a member's posts, comments and messages from the blocker
 * and stops them messaging (moderation.ts). This is where it is undone.
 */

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { BlockedMember, moderationService } from '../services/moderationService';
import { colors, fonts, radius, spacing, type as textType } from '../theme/designSystem';

export default function BlockedMembersScreen() {
  const [members, setMembers] = useState<BlockedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setMembers(await moderationService.blockedMembers(getCurrentUserId()));
    } catch (error) {
      console.error('Could not load blocked members:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unblock = async (member: BlockedMember) => {
    if (working) return;
    setWorking(member.userId);
    try {
      await moderationService.unblock(getCurrentUserId(), member.userId);
      setMembers(current => current.filter(m => m.userId !== member.userId));
      showToast(`${member.displayName} is unblocked`, 'success');
    } catch (error) {
      console.error('Could not unblock:', error);
      showToast("Couldn't unblock. Check your connection and try again.", 'error');
    } finally {
      setWorking(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>Blocked members</Text>
        <Text style={styles.note}>
          You don't see posts, comments or messages from anyone you block, and they can't message you. They are
          not told.
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.state} color={colors.ink} />
        ) : failed ? (
          <TouchableOpacity style={styles.empty} onPress={load} accessibilityRole="button">
            <Text style={styles.emptyText}>We couldn't load this list. Tap to try again.</Text>
          </TouchableOpacity>
        ) : members.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              You haven't blocked anyone. To block a member, open their profile or one of their posts and choose
              Block.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {members.map((member, index) => (
              <View key={member.userId} style={[styles.row, index === members.length - 1 && styles.rowLast]}>
                {member.profileImageUrl ? (
                  <Image source={{ uri: member.profileImageUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.initial}>{member.displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.who}>
                  <Text style={styles.name} numberOfLines={1}>
                    {member.displayName}
                  </Text>
                  {!!member.username && (
                    <Text style={styles.username} numberOfLines={1}>
                      @{member.username}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => unblock(member)}
                  disabled={working === member.userId}
                  accessibilityRole="button"
                  accessibilityLabel={`Unblock ${member.displayName}`}
                >
                  <Text style={styles.action}>{working === member.userId ? 'Unblocking…' : 'Unblock'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: 8 },
  content: { paddingHorizontal: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginTop: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginTop: 6, marginBottom: 8 },
  note: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted, marginBottom: spacing.lg },
  state: { marginTop: spacing.section },
  empty: { borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  card: { borderRadius: radius.md, backgroundColor: colors.paper, paddingHorizontal: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hair,
  },
  rowLast: { borderBottomWidth: 0 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.sm },
  avatarPlaceholder: { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.tobacco },
  who: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  username: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, marginTop: 1 },
  action: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.rust },
});
