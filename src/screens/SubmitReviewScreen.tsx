import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { reviewService } from '../services/reviewService';
import { SessionType } from '../types';
import SuccessAnimation from '../components/SuccessAnimation';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SubmitReviewRouteProp = RouteProp<RootStackParamList, 'SubmitReview'>;

export default function SubmitReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SubmitReviewRouteProp>();
  const { sessionId, stylistId, stylistName, sessionType } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast('Please select a rating', 'error');
      return;
    }

    if (comment.trim().length < 10) {
      showToast('Please write a longer review (at least 10 characters)', 'error');
      return;
    }

    try {
      setSubmitting(true);
      
      await reviewService.submitReview({
        stylistId,
        sessionId,
        sessionType: sessionType as SessionType,
        rating,
        comment: comment.trim(),
        wouldRecommend,
      });

      setShowSuccess(true);
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() =>setRating(star)}
            style={styles.starButton}
          >
            <Text style={[styles.star, star <= rating && styles.starFilled]}>
              {star <= rating ? '●' : '○'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() =>navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Write Review</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Stylist Info */}
        <View style={styles.stylistInfo}>
          <Text style={styles.stylistName}>{stylistName}</Text>
          <Text style={styles.sessionTypeText}>
            {sessionType?.replace('-', ' ')} session
          </Text>
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was your experience?</Text>
          {renderStars()}
          {rating >0 && (
            <Text style={styles.ratingText}>
              {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
            </Text>
          )}
        </View>

        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share your thoughts</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us about your experience with this stylist..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>{comment.length}/500</Text>
        </View>

        {/* Recommendation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Would you recommend this stylist?</Text>
          <View style={styles.recommendButtons}>
            <TouchableOpacity
              style={[styles.recommendButton, wouldRecommend && styles.recommendButtonActive]}
              onPress={() =>setWouldRecommend(true)}
            >
                            <Text style={[styles.recommendText, wouldRecommend && styles.recommendTextActive]}>Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.recommendButton, !wouldRecommend && styles.recommendButtonActive]}
              onPress={() =>setWouldRecommend(false)}
            >
                            <Text style={[styles.recommendText, !wouldRecommend && styles.recommendTextActive]}>No
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Review Tips</Text>
          <Text style={styles.tipText}>• Be specific about what you liked or didn't like</Text>
          <Text style={styles.tipText}>• Mention the stylist's strengths</Text>
          <Text style={styles.tipText}>• Share how the session helped you</Text>
          <Text style={styles.tipText}>• Be honest but respectful</Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (rating === 0 || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </View>

      <SuccessAnimation
        visible={showSuccess}
        message="Review submitted! "
        onComplete={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  stylistInfo: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  stylistName: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  sessionTypeText: {
    fontSize: 14,
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 40,
    opacity: 0.3,
  },
  starFilled: {
    opacity: 1,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  commentInput: {
    backgroundColor: colors.paper,
    padding: 16,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
    minHeight: 150,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 8,
  },
  recommendButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  recommendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.hair,
    gap: 8,
  },
  recommendButtonActive: {
    backgroundColor: colors.sand,
    borderColor: colors.ink,
  },
  recommendIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  recommendIconActive: {
    opacity: 1,
  },
  recommendText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
  },
  recommendTextActive: {
    color: colors.ink,
  },
  tipsSection: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  tipsTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: colors.tobacco,
    marginBottom: 6,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  submitButton: {
    backgroundColor: colors.ink,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.hair,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
});
