/**
 * Video Call Service
 * 
 * Provides video calling functionality for styling sessions.
 * In production, this would integrate with Twilio, Zoom, or similar.
 * For now, uses mock implementation with WebRTC simulation.
 */

export interface VideoCallConfig {
  sessionId: string;
  userId: string;
  stylistId: string;
  roomName: string;
}

export interface VideoCallStatus {
  isConnected: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  participantCount: number;
  duration: number;
}

export interface CallParticipant {
  id: string;
  name: string;
  role: 'user' | 'stylist';
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

class VideoCallService {
  private currentCall: VideoCallConfig | null = null;
  private callStatus: VideoCallStatus = {
    isConnected: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    participantCount: 0,
    duration: 0,
  };
  private durationInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize a video call
   */
  async initializeCall(config: VideoCallConfig): Promise<{ success: boolean; roomUrl?: string }> {
    try {
      // Simulate API call to create room
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.currentCall = config;
      this.callStatus.isConnected = true;
      this.callStatus.participantCount = 1;
      
      // Start duration counter
      this.startDurationCounter();
      
      // In production, this would return actual Twilio/Zoom room URL
      const roomUrl = `https://thirtythreetrends.com/call/${config.roomName}`;
      
      return { success: true, roomUrl };
    } catch (error) {
      console.error('Failed to initialize call:', error);
      return { success: false };
    }
  }

  /**
   * Join an existing call
   */
  async joinCall(roomName: string): Promise<{ success: boolean }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      this.callStatus.isConnected = true;
      this.callStatus.participantCount = 2;
      this.startDurationCounter();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to join call:', error);
      return { success: false };
    }
  }

  /**
   * End the current call
   */
  async endCall(): Promise<void> {
    this.stopDurationCounter();
    
    const duration = this.callStatus.duration;
    
    this.currentCall = null;
    this.callStatus = {
      isConnected: false,
      isVideoEnabled: true,
      isAudioEnabled: true,
      participantCount: 0,
      duration: 0,
    };
    
    // In production, would send call duration to backend
    console.log(`Call ended. Duration: ${duration} seconds`);
  }

  /**
   * Toggle video
   */
  toggleVideo(): boolean {
    this.callStatus.isVideoEnabled = !this.callStatus.isVideoEnabled;
    return this.callStatus.isVideoEnabled;
  }

  /**
   * Toggle audio
   */
  toggleAudio(): boolean {
    this.callStatus.isAudioEnabled = !this.callStatus.isAudioEnabled;
    return this.callStatus.isAudioEnabled;
  }

  /**
   * Get current call status
   */
  getCallStatus(): VideoCallStatus {
    return { ...this.callStatus };
  }

  /**
   * Get call participants
   */
  getParticipants(): CallParticipant[] {
    if (!this.currentCall) return [];
    
    // Mock participants
    return [
      {
        id: this.currentCall.userId,
        name: 'You',
        role: 'user',
        isVideoEnabled: this.callStatus.isVideoEnabled,
        isAudioEnabled: this.callStatus.isAudioEnabled,
      },
      {
        id: this.currentCall.stylistId,
        name: 'Stylist',
        role: 'stylist',
        isVideoEnabled: true,
        isAudioEnabled: true,
      },
    ];
  }

  /**
   * Start duration counter
   */
  private startDurationCounter(): void {
    this.callStatus.duration = 0;
    this.durationInterval = setInterval(() => {
      this.callStatus.duration++;
    }, 1000);
  }

  /**
   * Stop duration counter
   */
  private stopDurationCounter(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Format duration as MM:SS
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate meeting link for session
   */
  generateMeetingLink(sessionId: string): string {
    // In production, would call Twilio/Zoom API
    return `https://thirtythreetrends.com/session/${sessionId}/call`;
  }

  /**
   * Send meeting link via email/SMS
   */
  async sendMeetingLink(sessionId: string, recipientEmail: string): Promise<boolean> {
    try {
      // In production, would call email service
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Meeting link sent to ${recipientEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send meeting link:', error);
      return false;
    }
  }
}

export const videoCallService = new VideoCallService();
