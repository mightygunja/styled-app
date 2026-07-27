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
import { closetAPI, MOCK_USER_ID } from '../services/api';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

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
      const response = await closetAPI.getItems(MOCK_USER_ID);
      const items: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category as any,
        color: item.color,
        brand: item.brand,
        price: 0,
      }));

      if (items.length > 0) {
        const selectedItem = items[0];
        setItem(selectedItem);

        // Load user measurements
        const userMeasurements = await arTryOnService.getUserMeasurements(MOCK_USER_ID);
        if (userMeasurements) {
          setMeasurements(userMeasurements);
        } else {
          // Set default measurements
          await arTryOnService.setUserMeasurements(MOCK_USER_ID, measurements);
        }

        // Start AR try-on
        const result = await arTryOnService.startTryOn(MOCK_USER_ID, selectedItem);
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
      await arTryOnService.setUserMeasurements(MOCK_USER_ID, measurements);
      setShowMeasurements(false);
      
      if (item) {
        setLoading(true);
        const result = await arTryOnService.startTryOn(MOCK_USER_ID, item);
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
      perfect: '#10b981',
      good: '#3b82f6',
      loose: '#f59e0b',
      tight: '#ef4444',
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
      perfect: '#10b981',
      good: '#3b82f6',
      check: '#f59e0b',
    };
    return colors[status as keyof typeof colors] || '#64748b';
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
          <ActivityIndicator size="large" color="#ef4444" />
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
                    { color: Math.abs(measurement.difference) < 5 ? '#10b981' : '#f59e0b' }
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  measureButton: {
    fontSize: 24,
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: height * 0.5,
    backgroundColor: '#f1f5f9',
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
    fontWeight: 'bold',
    color: '#ffffff',
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
    fontWeight: '600',
    color: '#ffffff',
  },
  scoreContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 20,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
  },
  scoreDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  suggestedSize: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  measurementCard: {
    backgroundColor: '#f8fafc',
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
    fontWeight: '600',
    color: '#0f172a',
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
    fontWeight: 'bold',
    color: '#ffffff',
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
    color: '#64748b',
    marginBottom: 4,
  },
  measurementValueNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  recommendationsCard: {
    backgroundColor: '#eff6ff',
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
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
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
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  sizeCardActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  sizeLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 4,
  },
  sizeLabelActive: {
    color: '#ef4444',
  },
  sizeFitScore: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  sizeBestFit: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ef4444',
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
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
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
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fitOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  fitOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  fitOptionActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  fitOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  fitOptionTextActive: {
    color: '#ef4444',
  },
  saveButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
