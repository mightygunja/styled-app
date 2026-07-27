import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import FollowListView from '../components/FollowListView';

type FollowersRouteProp = RouteProp<RootStackParamList, 'Followers'>;

export default function FollowersScreen() {
  const route = useRoute<FollowersRouteProp>();
  return <FollowListView userId={route.params.userId} mode="followers" />;
}
