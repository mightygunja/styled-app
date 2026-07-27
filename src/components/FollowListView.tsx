import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { userProfileService, UserProfile } from '../services/userProfileService';

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{mode === 'followers' ? 'Followers' : 'Following'}</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.userId}
          contentContainerStyle={users.length === 0 ? styles.emptyList : undefined}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.push('UserProfile', { userId: item.userId })}
            >
              {item.profileImageUrl ? (
                <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{item.displayName.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.displayName}>{item.displayName}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: { fontSize: 16, color: '#64748b' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9' },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  rowInfo: { marginLeft: 12 },
  displayName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  username: { fontSize: 13, color: '#64748b', marginTop: 2 },
  emptyList: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyText: { fontSize: 15, color: '#64748b' },
});
