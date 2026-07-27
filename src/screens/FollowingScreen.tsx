import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import FollowListView from '../components/FollowListView';

type FollowingRouteProp = RouteProp<RootStackParamList, 'Following'>;

export default function FollowingScreen() {
  const route = useRoute<FollowingRouteProp>();
  return <FollowListView userId={route.params.userId} mode="following" />;
}
