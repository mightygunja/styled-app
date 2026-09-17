import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  sessionNotesService,
  SessionNote,
  NoteCategory,
} from '../services/sessionNotesService';
import { stylistBookingsService } from '../services/firestore';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SessionNotesRouteProp = RouteProp<RootStackParamList, 'SessionNotes'>;

const NOTE_CATEGORIES: { id: NoteCategory; label: string; icon: string }[] = [
  { id: 'observation', label: 'Observation', icon: '' },
  { id: 'recommendation', label: 'Recommendation', icon: '' },
  { id: 'action-item', label: 'Action Item', icon: '' },
  { id: 'style-tip', label: 'Style Tip', icon: '' },
  { id: 'product-suggestion', label: 'Product', icon: '' },
];

export default function SessionNotesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SessionNotesRouteProp>();
  const { sessionId } = route.params;

  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>('observation');
  // Shown inside the sheet - the screen's Toast sits underneath the Modal.
  const [addError, setAddError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  // Which side of the session is looking. The stylist opens this same screen
  // from their dashboard; their notes used to be saved as the client's, so
  // the client saw them signed "You" with a delete button.
  const [viewerRole, setViewerRole] = useState<'user' | 'stylist'>('user');

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    stylistBookingsService
      .getById(sessionId)
      .then(booking => {
        const uid = getCurrentUserId();
        if (!cancelled && booking && booking.stylistId === uid && booking.userId !== uid) {
          setViewerRole('stylist');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Recommendations and deliverables tabs are gone: no stylist-side tool
  // exists to author either, so both were permanently empty for every user.
  // Bring them back only alongside the tool that populates them.
  const loadSessionData = async () => {
    try {
      setLoading(true);
      setNotes(await sessionNotesService.getSessionNotes(sessionId));
    } catch (error) {
      console.error('Error loading session data:', error);
      showToast('Failed to load session notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || savingNote) return;

    try {
      setAddError(null);
      setSavingNote(true);
      const note = await sessionNotesService.addNote(
        sessionId,
        newNoteContent,
        selectedCategory,
        viewerRole
      );

      setNotes([...notes, note]);
      setNewNoteContent('');
      setShowAddNote(false);
      showToast('Note added successfully', 'success');
    } catch (error) {
      console.error('Error adding note:', error);
      setAddError("Couldn't save this note. Try again.");
    } finally {
      setSavingNote(false);
    }
  };

  const closeAddNote = () => {
    setShowAddNote(false);
    setAddError(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await sessionNotesService.deleteNote(noteId);
              setNotes(notes.filter(n =>n.id !== noteId));
              showToast('Note deleted', 'success');
            } catch (error) {
              showToast('Failed to delete note', 'error');
            }
          },
        },
      ]
    );
  };

  // Hands the real note text to the system share sheet - not a claimed PDF.
  const handleExportNotes = async () => {
    if (notes.length === 0) {
      showToast('No notes to export yet', 'error');
      return;
    }
    try {
      const text = await sessionNotesService.exportNotes(sessionId);
      await Share.share({ message: text });
    } catch (error) {
      showToast('Failed to export notes', 'error');
    }
  };

  const getCategoryIcon = (category: NoteCategory): string => {
    return NOTE_CATEGORIES.find(c =>c.id === category)?.icon || '';
  };

  const renderNote = (note: SessionNote) => (
    <View key={note.id} style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View style={styles.noteCategory}>
          <Text style={styles.categoryIcon}>{getCategoryIcon(note.category)}</Text>
          <Text style={styles.categoryLabel}>
            {NOTE_CATEGORIES.find(c =>c.id === note.category)?.label}
          </Text>
        </View>
        {note.createdBy === viewerRole && (
          <TouchableOpacity onPress={() =>handleDeleteNote(note.id)} accessibilityLabel="Delete note">
            <Ionicons name="close" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.noteContent}>{note.content}</Text>
      <View style={styles.noteFooter}>
        <Text style={styles.noteAuthor}>
          {note.createdBy === viewerRole ? ' You' : note.createdBy === 'stylist' ? ' Stylist' : ' Client'}
        </Text>
        <Text style={styles.noteDate}>
          {new Date(note.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading session notes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Session Notes</Text>
        <TouchableOpacity onPress={handleExportNotes}>
          <Text style={styles.exportButton}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        <View style={styles.notesContainer}>
          {notes.map(renderNote)}
          {notes.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptySubtext}>Add notes during your session</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Note Button */}
      <TouchableOpacity style={styles.fab} onPress={() =>setShowAddNote(true)} accessibilityLabel="Add note">
        <Ionicons name="add" size={30} color={colors.white} />
      </TouchableOpacity>

      {/* Add Note Modal */}
      <Modal
        visible={showAddNote}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddNote}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeAddNote} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.inkMuted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TouchableOpacity
              style={[styles.modalSaveButton, (!newNoteContent.trim() || savingNote) && styles.modalSaveDisabled]}
              onPress={handleAddNote}
              disabled={!newNoteContent.trim() || savingNote}
            >
              {savingNote ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {NOTE_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === cat.id && styles.categoryButtonActive,
                  ]}
                  onPress={() =>setSelectedCategory(cat.id)}
                >
                  <Text style={styles.categoryButtonIcon}>{cat.icon}</Text>
                  <Text style={styles.categoryButtonText}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Enter your note..."
              placeholderTextColor={colors.inkFaint}
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {!!addError && <Text style={styles.addError}>{addError}</Text>}
          </View>
        </SafeAreaView>
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
    backgroundColor: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.inkMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  exportButton: {
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  content: {
    flex: 1,
  },
  notesContainer: {
    padding: 20,
  },
  noteCard: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
  },
  noteContent: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteAuthor: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
  },
  noteDate: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkFaint,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bone,
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
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  modalSaveButton: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  // Disabled stays rust at reduced opacity - never a grey fill.
  modalSaveDisabled: {
    opacity: 0.4,
  },
  modalSave: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  addError: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.rust,
    marginTop: 12,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: colors.hair,
  },
  categoryButtonActive: {
    backgroundColor: colors.sand,
    borderColor: colors.ink,
  },
  categoryButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
  noteInput: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 16,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
    minHeight: 150,
  },
});
