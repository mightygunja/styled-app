import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from './BackButton';
import { RootStackParamList } from '../navigation/types';
import { userProfileService, UserProfile } from '../services/userProfileService';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  userId: string;
  mode: 'followers' | 'following';
}

export default function FollowListView({ userId, mode }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [userId, mode]);

  const load = async () => {
    try {
      setLoading(true);
      const list =
        mode === 'followers'
          ? await userProfileService.getFollowers(userId)
          : await userProfileService.getFollowing(userId);
      setUsers(list);
    } catch (error) {
      console.error('Error loading follow list:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <FlatList
        data={loading ? [] : users}
        keyExtractor={item => item.userId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>{mode === 'followers' ? 'AUDIENCE' : 'FOLLOWING'}</Text>
            <Text style={styles.title}>{mode === 'followers' ? 'Followers' : 'Following'}</Text>
            {!loading && users.length > 0 && (
              <Text style={styles.subtitle}>
                {users.length} {users.length === 1 ? 'person' : 'people'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => navigation.push('UserProfile', { userId: item.userId })}
          >
            {item.profileImageUrl ? (
              <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {item.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.rowInfo}>
              <Text style={styles.displayName}>{item.displayName}</Text>
              <Text style={styles.username}>@{item.username}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.busyBox}>
              <ActivityIndicator size="large" color={colors.ink} />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                {mode === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </Text>
              <Text style={styles.emptyText}>
                {mode === 'followers'
                  ? 'People who follow this profile will appear here.'
                  : 'Accounts followed from this profile will appear here.'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { paddingHorizontal: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 80, alignItems: 'center' },

  intro: { marginBottom: spacing.lg },
  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  avatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.paper },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 18, color: colors.tobacco },
  rowInfo: { flex: 1, marginLeft: 12 },
  displayName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  username: { ...textType.meta, fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.inkFaint },

  emptyBox: {
    borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
});
