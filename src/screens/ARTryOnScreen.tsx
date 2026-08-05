import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  arTryOnService,
  ARTryOnResult,
  UserMeasurements,
  FitRating,
} from '../services/arTryOnService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors as ds, fonts } from '../theme/designSystem';

const { width, height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ARTryOnRouteProp = RouteProp<RootStackParamList, 'ARTryOn'>;

export default function ARTryOnScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ARTryOnRouteProp>();
  const [loading, setLoading] = useState(true);
  const [tryOnResult, setTryOnResult] = useState<ARTryOnResult | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measurements, setMeasurements] = useState<UserMeasurements>({
    height: 170,
    chest: 90,
    waist: 75,
    hips: 95,
    inseam: 78,
    shoeSize: 9,
    preferredFit: 'regular',
  });
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadItemAndTryOn();
  }, []);

  const loadItemAndTryOn = async () => {
    try {
      setLoading(true);

      // Get item (in real app, would come from route params)
      const response = await closetAPI.getItems(getCurrentUserId());
      const items: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category as any,
        color: item.color,
        brand: item.brand,
        price: item.price || 0,
        wornCount: item.wornCount,
        lastWornDate: item.lastWornDate,
        purchaseDate: item.purchaseDate,
        createdAt: item.createdAt,
        tags: item.tags,
        seasons: item.seasons,
        style: item.style,
      }));

      if (items.length > 0) {
        const selectedItem = items[0];
        setItem(selectedItem);

        // Load user measurements
        const userMeasurements = await arTryOnService.getUserMeasurements(getCurrentUserId());
        if (userMeasurements) {
          setMeasurements(userMeasurements);
        } else {
          // Set default measurements
          await arTryOnService.setUserMeasurements(getCurrentUserId(), measurements);
        }

        // Start AR try-on
        const result = await arTryOnService.startTryOn(getCurrentUserId(), selectedItem);
        setTryOnResult(result);
      }
    } catch (error) {
      console.error('Error loading AR try-on:', error);
      showToast('Failed to load AR try-on', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMeasurements = async () => {
    try {
      await arTryOnService.setUserMeasurements(getCurrentUserId(), measurements);
      setShowMeasurements(false);
      
      if (item) {
        setLoading(true);
        const result = await arTryOnService.startTryOn(getCurrentUserId(), item);
        setTryOnResult(result);
        setLoading(false);
      }
      
      showToast('Measurements updated', 'success');
    } catch (error) {
      showToast('Failed to update measurements', 'error');
    }
  };

  const getFitRatingColor = (rating: FitRating): string => {
    const colors = {
      perfect: ds.tobacco,
      good: ds.tobacco,
      loose: ds.camel,
      tight: ds.tobacco,
    };
    return colors[rating];
  };

  const getFitRatingLabel = (rating: FitRating): string => {
    const labels = {
      perfect: 'Perfect Fit',
      good: 'Good Fit',
      loose: 'Slightly Loose',
      tight: 'Slightly Tight',
    };
    return labels[rating];
  };

  const getMeasurementStatusColor = (status: string): string => {
    const colors = {
      perfect: ds.tobacco,
      good: ds.tobacco,
      check: ds.camel,
    };
    return colors[status as keyof typeof colors] || ds.inkMuted;
  };

  const getMeasurementStatusIcon = (status: string): string => {
    const icons = {
      perfect: '✓',
      good: '✓',
      check: '!',
    };
    return icons[status as keyof typeof icons] || '?';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ds.tobacco} />
          <Text style={styles.loadingText}>Loading AR Try-On...</Text>
          <Text style={styles.loadingSubtext}>Analyzing fit and measurements</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tryOnResult || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No item to try on</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Try-On</Text>
        <TouchableOpacity onPress={() => setShowMeasurements(true)}>
          <Text style={styles.measureButton}>📏</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* AR Preview */}
        <View style={styles.previewContainer}>
          <Image source={{ uri: tryOnResult.visualPreview }} style={styles.previewImage} />
          <View style={styles.previewOverlay}>
            <View style={[styles.fitBadge, { backgroundColor: getFitRatingColor(tryOnResult.fitRating) }]}>
              <Text style={styles.fitBadgeText}>{getFitRatingLabel(tryOnResult.fitRating)}</Text>
            </View>
          </View>
          <View style={styles.arLabel}>
            <Text style={styles.arLabelText}>🎯 AR Preview</Text>
          </View>
        </View>

        {/* Fit Score */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{tryOnResult.fitScore.toFixed(0)}</Text>
            <Text style={styles.scoreLabel}>Fit Score</Text>
          </View>
          <View style={styles.scoreDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemBrand}>{item.brand || 'Brand'}</Text>
            <Text style={styles.suggestedSize}>Suggested Size: {tryOnResult.suggestedSize}</Text>
          </View>
        </View>

        {/* Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fit Analysis</Text>
          {tryOnResult.measurements.map((measurement, index) => (
            <View key={index} style={styles.measurementCard}>
              <View style={styles.measurementHeader}>
                <Text style={styles.measurementName}>
                  {measurement.measurement.charAt(0).toUpperCase() + measurement.measurement.slice(1)}
                </Text>
                <View style={[styles.measurementStatus, { backgroundColor: getMeasurementStatusColor(measurement.status) }]}>
                  <Text style={styles.measurementStatusText}>
                    {getMeasurementStatusIcon(measurement.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.measurementValues}>
                <View style={styles.measurementValue}>
                  <Text style={styles.measurementValueLabel}>Your Size</Text>
                  <Text style={styles.measurementValueNumber}>{measurement.userValue} cm</Text>
                </View>
                <View style={styles.measurementValue}>
                  <Text style={styles.measurementValueLabel}>Item Size</Text>
                  <Text style={styles.measurementValueNumber}>{measurement.itemValue.toFixed(1)} cm</Text>
                </View>
                <View style={styles.measurementValue}>
                  <Text style={styles.measurementValueLabel}>Difference</Text>
                  <Text style={[
                    styles.measurementValueNumber,
                    { color: Math.abs(measurement.difference) < 5 ? ds.tobacco : ds.camel }
                  ]}>
                    {measurement.difference > 0 ? '+' : ''}{measurement.difference.toFixed(1)} cm
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.recommendationsCard}>
            {tryOnResult.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>•</Text>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Alternative Sizes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alternative Sizes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.sizesGrid}>
              {tryOnResult.alternativeSizes.map((alt, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sizeCard,
                    alt.size === tryOnResult.suggestedSize && styles.sizeCardActive,
                  ]}
                >
                  <Text style={[
                    styles.sizeLabel,
                    alt.size === tryOnResult.suggestedSize && styles.sizeLabelActive,
                  ]}>
                    {alt.size}
                  </Text>
                  <Text style={styles.sizeFitScore}>{alt.fitScore}%</Text>
                  {alt.size === tryOnResult.suggestedSize && (
                    <Text style={styles.sizeBestFit}>Best Fit</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📸 Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]}>
            <Text style={styles.actionButtonTextPrimary}>🛒 Add to Cart</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Measurements Modal */}
      <Modal
        visible={showMeasurements}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMeasurements(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Measurements</Text>
              <TouchableOpacity onPress={() => setShowMeasurements(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={measurements.height.toString()}
                  onChangeText={(text) => setMeasurements({ ...measurements, height: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chest (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={measurements.chest.toString()}
                  onChangeText={(text) => setMeasurements({ ...measurements, chest: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Waist (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={measurements.waist.toString()}
                  onChangeText={(text) => setMeasurements({ ...measurements, waist: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hips (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={measurements.hips.toString()}
                  onChangeText={(text) => setMeasurements({ ...measurements, hips: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Inseam (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={measurements.inseam.toString()}
                  onChangeText={(text) => setMeasurements({ ...measurements, inseam: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Preferred Fit</Text>
                <View style={styles.fitOptions}>
                  {['slim', 'regular', 'relaxed'].map((fit) => (
                    <TouchableOpacity
                      key={fit}
                      style={[
                        styles.fitOption,
                        measurements.preferredFit === fit && styles.fitOptionActive,
                      ]}
                      onPress={() => setMeasurements({ ...measurements, preferredFit: fit as any })}
                    >
                      <Text style={[
                        styles.fitOptionText,
                        measurements.preferredFit === fit && styles.fitOptionTextActive,
                      ]}>
                        {fit.charAt(0).toUpperCase() + fit.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateMeasurements}>
                <Text style={styles.saveButtonText}>Save & Update Fit</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    backgroundColor: ds.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: ds.inkMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: ds.inkMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  backButton: {
    fontSize: 16,
    color: ds.inkMuted,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  measureButton: {
    fontSize: 24,
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: height * 0.5,
    backgroundColor: ds.paper,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  fitBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fitBadgeText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  arLabel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  arLabelText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  scoreContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: ds.paper,
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
    gap: 20,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ds.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  scoreLabel: {
    fontSize: 12,
    color: ds.white,
    marginTop: 4,
  },
  scoreDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 14,
    color: ds.inkMuted,
    marginBottom: 8,
  },
  suggestedSize: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ds.paper,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 16,
  },
  measurementCard: {
    backgroundColor: ds.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  measurementName: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  measurementStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  measurementStatusText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  measurementValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  measurementValue: {
    flex: 1,
  },
  measurementValueLabel: {
    fontSize: 12,
    color: ds.inkMuted,
    marginBottom: 4,
  },
  measurementValueNumber: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  recommendationsCard: {
    backgroundColor: ds.sand,
    borderRadius: 12,
    padding: 16,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  recommendationBullet: {
    fontSize: 16,
    color: ds.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: ds.tobacco,
    lineHeight: 20,
  },
  sizesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeCard: {
    width: 100,
    padding: 16,
    borderRadius: 12,
    backgroundColor: ds.paper,
    borderWidth: 2,
    borderColor: ds.hair,
    alignItems: 'center',
  },
  sizeCardActive: {
    backgroundColor: ds.sand,
    borderColor: ds.ink,
  },
  sizeLabel: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
    marginBottom: 4,
  },
  sizeLabelActive: {
    color: ds.tobacco,
  },
  sizeFitScore: {
    fontSize: 14,
    color: ds.inkMuted,
    marginBottom: 4,
  },
  sizeBestFit: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ds.hair,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: ds.ink,
    borderColor: ds.ink,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
  },
  actionButtonTextPrimary: {
    color: ds.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: ds.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  modalClose: {
    fontSize: 24,
    color: ds.inkMuted,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: ds.paper,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: ds.ink,
    borderWidth: 1,
    borderColor: ds.hair,
  },
  fitOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  fitOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ds.paper,
    borderWidth: 2,
    borderColor: ds.hair,
    alignItems: 'center',
  },
  fitOptionActive: {
    backgroundColor: ds.sand,
    borderColor: ds.ink,
  },
  fitOptionText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
  },
  fitOptionTextActive: {
    color: ds.tobacco,
  },
  saveButton: {
    backgroundColor: ds.ink,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
});
