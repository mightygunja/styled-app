import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { FilterOptions } from '../types';
import { PRICE_BANDS, BODY_TYPES, LIFESTYLE_FILTERS } from '../constants';
import { colors, fonts } from '../theme/designSystem';

interface FilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export default function FilterBar({ onFilterChange, currentFilters }: FilterBarProps) {
  const [showModal, setShowModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterOptions>(currentFilters);

  const handleApplyFilters = () => {
    onFilterChange(tempFilters);
    setShowModal(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: FilterOptions = {
      occasions: [],
      priceMin: undefined,
      priceMax: undefined,
      colors: [],
      bodyTypes: [],
      lifestyleFilters: [],
    };
    setTempFilters(emptyFilters);
    onFilterChange(emptyFilters);
    setShowModal(false);
  };

  const togglePriceBand = (band: keyof typeof PRICE_BANDS) => {
    const priceRange = PRICE_BANDS[band];
    setTempFilters({
      ...tempFilters,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
    });
  };

  const toggleBodyType = (bodyType: string) => {
    const current = tempFilters.bodyTypes || [];
    const updated = current.includes(bodyType)
      ? current.filter(t => t !== bodyType)
      : [...current, bodyType];
    setTempFilters({ ...tempFilters, bodyTypes: updated });
  };

  const toggleLifestyleFilter = (filter: string) => {
    const current = tempFilters.lifestyleFilters || [];
    const updated = current.includes(filter)
      ? current.filter(f => f !== filter)
      : [...current, filter];
    setTempFilters({ ...tempFilters, lifestyleFilters: updated });
  };

  const activeFilterCount = [
    tempFilters.priceMin !== undefined,
    (tempFilters.bodyTypes?.length || 0) > 0,
    (tempFilters.lifestyleFilters?.length || 0) > 0,
    (tempFilters.colors?.length || 0) > 0,
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilters}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowModal(true)}>
          <Text style={styles.filterButtonText}>
            🔍 Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Text>
        </TouchableOpacity>

        {Object.entries(PRICE_BANDS).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterChip,
              tempFilters.priceMin === value.min && styles.filterChipActive,
            ]}
            onPress={() => togglePriceBand(key as keyof typeof PRICE_BANDS)}
          >
            <Text
              style={[
                styles.filterChipText,
                tempFilters.priceMin === value.min && styles.filterChipTextActive,
              ]}
            >
              {value.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Price Range</Text>
                <View style={styles.chipGrid}>
                  {Object.entries(PRICE_BANDS).map(([key, value]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.chip,
                        tempFilters.priceMin === value.min && styles.chipActive,
                      ]}
                      onPress={() => togglePriceBand(key as keyof typeof PRICE_BANDS)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          tempFilters.priceMin === value.min && styles.chipTextActive,
                        ]}
                      >
                        {value.label} (${value.min}-${value.max})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Body Types */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Body Type</Text>
                <View style={styles.chipGrid}>
                  {Object.entries(BODY_TYPES).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.chip,
                        tempFilters.bodyTypes?.includes(key) && styles.chipActive,
                      ]}
                      onPress={() => toggleBodyType(key)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          tempFilters.bodyTypes?.includes(key) && styles.chipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Lifestyle Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Lifestyle</Text>
                <View style={styles.chipGrid}>
                  {Object.entries(LIFESTYLE_FILTERS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.chip,
                        tempFilters.lifestyleFilters?.includes(key) && styles.chipActive,
                      ]}
                      onPress={() => toggleLifestyleFilter(key)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          tempFilters.lifestyleFilters?.includes(key) && styles.chipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  quickFilters: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  filterButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  filterChip: {
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.ink,
  },
  filterChipText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontFamily: fonts.sansMedium,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  closeButton: {
    fontSize: 24,
    color: colors.inkMuted,
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: colors.ink,
  },
  chipText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontFamily: fonts.sansMedium,
  },
  chipTextActive: {
    color: colors.white,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.hair,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.inkMuted,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
});
