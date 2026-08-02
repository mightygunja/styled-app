import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { readAsStringAsync } from 'expo-file-system/legacy';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import PhotoUploadModal from '../components/PhotoUploadModal';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { closetAPI, getCurrentUserId } from '../services/api';
import { tryOnAPI } from '../services/firebaseApi';
import { uploadImageToFirebase } from '../services/firebaseStorage';
import { styleProfileService } from '../services/firestore';

export default function TryOnScreen() {
  const [closetItems, setClosetItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [personImageUrl, setPersonImageUrl] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const userId = getCurrentUserId();
      const [closetResponse, profile] = await Promise.all([
        closetAPI.getItems(userId),
        styleProfileService.getStyleProfile(userId),
      ]);
      setClosetItems((closetResponse.data || []).filter((i: any) => i.imageUrl));
      // Reuse the full-length photo from body analysis when there is one, so
      // most users never have to take a second one.
      if (profile?.bodyAnalysis?.sourceImageUrl) {
        setPersonImageUrl(profile.bodyAnalysis.sourceImageUrl);
      }
    } catch (error) {
      console.error('Error loading try-on data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonPhoto = async (uri: string) => {
    try {
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      const url = await uploadImageToFirebase(
        `data:image/jpeg;base64,${base64}`,
        getCurrentUserId(),
        'tryOnPerson'
      );
      setPersonImageUrl(url);
      setRenderUrl(null);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Upload failed', error?.message || 'Please try again.');
    }
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
    setRenderUrl(null);
  };

  const handleRender = async () => {
    if (!personImageUrl || selectedIds.length === 0) return;

    setRendering(true);
    try {
      const descriptions = selectedIds
        .map(id => closetItems.find(i => i.id === id))
        .filter(Boolean)
        .map(item =>
          [item.color, item.pattern && item.pattern !== 'solid' ? item.pattern : null, item.subcategory || item.category]
            .filter(Boolean)
            .join(' ')
        );

      const url = await tryOnAPI.render(personImageUrl, descriptions, getCurrentUserId());
      setRenderUrl(url);
    } catch (error: any) {
      console.error('Error rendering try-on:', error);
      Alert.alert(
        'Render failed',
        error?.message || "We couldn't render that look. Try a clear, full-length photo against a simple background."
      );
    } finally {
      setRendering(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>VIRTUAL TRY-ON</Text>
        <Text style={styles.title}>See it on you</Text>
        <Text style={styles.subtitle}>
          Rendered on your own photo, not a generic avatar — so what you see reflects your actual
          proportions.
        </Text>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>YOUR PHOTO</Text>
            {personImageUrl ? (
              <View style={styles.personRow}>
                <Image source={{ uri: personImageUrl }} style={styles.personThumb} />
                <TouchableOpacity onPress={() => setShowPhotoModal(true)}>
                  <Text style={styles.changeLink}>Use a different photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.helper}>
                  A full-length photo works best — standing, facing the camera, simple background.
                </Text>
                <Button
                  title="Add a photo"
                  variant="secondary"
                  onPress={() => setShowPhotoModal(true)}
                  fullWidth
                />
              </>
            )}

            <Text style={styles.sectionLabel}>PICK THE PIECES</Text>
            {closetItems.length === 0 ? (
              <Text style={styles.helper}>
                Add some items to your closet with photos first.
              </Text>
            ) : (
              <View style={styles.grid}>
                {closetItems.map(item => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.gridItem, selected && styles.gridItemSelected]}
                      onPress={() => toggleItem(item.id)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
                      {selected && (
                        <View style={styles.check}>
                          <Text style={styles.checkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {renderUrl && (
              <>
                <Text style={styles.sectionLabel}>THE LOOK</Text>
                <Image source={{ uri: renderUrl }} style={styles.render} resizeMode="contain" />
                <Text style={styles.disclaimer}>
                  An AI rendering, not a photograph. Treat it as a sketch of the look — fit and
                  fabric behave differently in person.
                </Text>
              </>
            )}

            <Button
              title={rendering ? 'Rendering…' : renderUrl ? 'Render again' : 'Try it on'}
              onPress={handleRender}
              fullWidth
              disabled={!personImageUrl || selectedIds.length === 0 || rendering}
              style={{ marginTop: spacing.section }}
            />
            {rendering && (
              <Text style={styles.renderingNote}>
                This takes up to a minute — image generation is slow.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <PhotoUploadModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelected={uri => {
          setShowPhotoModal(false);
          handlePersonPhoto(uri);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },
  helper: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginBottom: 12 },

  busyBox: { paddingVertical: 80, alignItems: 'center' },

  personRow: { flexDirection: 'row', alignItems: 'center' },
  personThumb: { width: 72, height: 96, backgroundColor: colors.paper, marginRight: 14 },
  changeLink: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.tobacco },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: {
    width: 92,
    height: 92,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridItemSelected: { borderColor: colors.ink },
  gridImage: { width: '100%', height: '100%' },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: colors.white, fontSize: 13, fontFamily: fonts.sansSemiBold },

  render: { width: '100%', height: 460, backgroundColor: colors.paper },
  disclaimer: { ...textType.meta, fontSize: 11, marginTop: 10, color: colors.inkFaint },
  renderingNote: { ...textType.meta, fontSize: 12, marginTop: 10, textAlign: 'center' },
});
