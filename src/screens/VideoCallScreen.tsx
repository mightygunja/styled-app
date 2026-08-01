import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { videoCallService, VideoCallStatus } from '../services/videoCallService';
import { getCurrentUserId } from '../services/api';

const { width, height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type VideoCallRouteProp = RouteProp<RootStackParamList, 'VideoCall'>;

export default function VideoCallScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VideoCallRouteProp>();
  const { sessionId, stylistName } = route.params;

  const [isConnecting, setIsConnecting] = useState(true);
  const [callStatus, setCallStatus] = useState<VideoCallStatus>(videoCallService.getCallStatus());
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    initializeCall();
    
    // Update call status every second
    const interval = setInterval(() => {
      const status = videoCallService.getCallStatus();
      setCallStatus(status);
      setDuration(status.duration);
    }, 1000);

    return () => {
      clearInterval(interval);
      handleEndCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      const result = await videoCallService.initializeCall({
        sessionId,
        userId: getCurrentUserId(),
        stylistId: 'stylist-id',
        roomName: `session-${sessionId}`,
      });

      if (result.success) {
        setIsConnecting(false);
      } else {
        Alert.alert('Error', 'Failed to connect to call');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Call initialization error:', error);
      Alert.alert('Error', 'Failed to start call');
      navigation.goBack();
    }
  };

  const handleToggleVideo = () => {
    const enabled = videoCallService.toggleVideo();
    setCallStatus({ ...callStatus, isVideoEnabled: enabled });
  };

  const handleToggleAudio = () => {
    const enabled = videoCallService.toggleAudio();
    setCallStatus({ ...callStatus, isAudioEnabled: enabled });
  };

  const handleEndCall = async () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            await videoCallService.endCall();
            navigation.navigate('SessionNotes', { sessionId });
          },
        },
      ]
    );
  };

  const handleOpenNotes = () => {
    navigation.navigate('SessionNotes', { sessionId });
  };

  if (isConnecting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.connectingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.connectingText}>Connecting to {stylistName}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Area (Mock) */}
      <View style={styles.videoContainer}>
        {/* Stylist Video (Large) */}
        <View style={styles.stylistVideo}>
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoPlaceholderText}>👤</Text>
            <Text style={styles.participantName}>{stylistName}</Text>
          </View>
        </View>

        {/* User Video (Small, Picture-in-Picture) */}
        <View style={styles.userVideo}>
          <View style={styles.smallVideoPlaceholder}>
            {callStatus.isVideoEnabled ? (
              <>
                <Text style={styles.smallVideoPlaceholderText}>👤</Text>
                <Text style={styles.smallParticipantName}>You</Text>
              </>
            ) : (
              <View style={styles.videoOffIndicator}>
                <Text style={styles.videoOffText}>📷</Text>
                <Text style={styles.videoOffLabel}>Camera Off</Text>
              </View>
            )}
          </View>
        </View>

        {/* Call Duration */}
        <View style={styles.durationBadge}>
          <View style={styles.recordingDot} />
          <Text style={styles.durationText}>
            {videoCallService.formatDuration(duration)}
          </Text>
        </View>

        {/* Connection Status */}
        <View style={styles.statusBadge}>
          <View style={styles.connectedDot} />
          <Text style={styles.statusText}>Connected</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.notesButton} onPress={handleOpenNotes}>
            <Text style={styles.notesIcon}>📝</Text>
            <Text style={styles.notesButtonText}>Notes</Text>
          </TouchableOpacity>
        </View>

        {/* Main Controls */}
        <View style={styles.mainControls}>
          {/* Toggle Audio */}
          <TouchableOpacity
            style={[styles.controlButton, !callStatus.isAudioEnabled && styles.controlButtonOff]}
            onPress={handleToggleAudio}
          >
            <Text style={styles.controlIcon}>
              {callStatus.isAudioEnabled ? '🎤' : '🔇'}
            </Text>
            <Text style={styles.controlLabel}>
              {callStatus.isAudioEnabled ? 'Mute' : 'Unmute'}
            </Text>
          </TouchableOpacity>

          {/* End Call */}
          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <Text style={styles.endCallIcon}>📞</Text>
            <Text style={styles.endCallLabel}>End</Text>
          </TouchableOpacity>

          {/* Toggle Video */}
          <TouchableOpacity
            style={[styles.controlButton, !callStatus.isVideoEnabled && styles.controlButtonOff]}
            onPress={handleToggleVideo}
          >
            <Text style={styles.controlIcon}>
              {callStatus.isVideoEnabled ? '📹' : '📷'}
            </Text>
            <Text style={styles.controlLabel}>
              {callStatus.isVideoEnabled ? 'Stop Video' : 'Start Video'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Additional Controls */}
        <View style={styles.additionalControls}>
          <TouchableOpacity style={styles.smallControlButton}>
            <Text style={styles.smallControlIcon}>💬</Text>
            <Text style={styles.smallControlLabel}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallControlButton}>
            <Text style={styles.smallControlIcon}>🖼️</Text>
            <Text style={styles.smallControlLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallControlButton}>
            <Text style={styles.smallControlIcon}>◎</Text>
            <Text style={styles.smallControlLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#ffffff',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  stylistVideo: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    fontSize: 120,
    marginBottom: 20,
  },
  participantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  smallVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallVideoPlaceholderText: {
    fontSize: 40,
    marginBottom: 4,
  },
  smallParticipantName: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  videoOffIndicator: {
    alignItems: 'center',
  },
  videoOffText: {
    fontSize: 32,
    marginBottom: 4,
  },
  videoOffLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  durationBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsContainer: {
    backgroundColor: '#1e293b',
    paddingBottom: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  notesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  notesIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  notesButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  controlButton: {
    width: 80,
    alignItems: 'center',
  },
  controlButtonOff: {
    opacity: 0.6,
  },
  controlIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  controlLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  endCallButton: {
    width: 80,
    alignItems: 'center',
  },
  endCallIcon: {
    fontSize: 32,
    marginBottom: 8,
    transform: [{ rotate: '135deg' }],
  },
  endCallLabel: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 30,
  },
  smallControlButton: {
    alignItems: 'center',
  },
  smallControlIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  smallControlLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
});
