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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  sessionNotesService,
  SessionNote,
  StyleRecommendation,
  SessionDeliverable,
  NoteCategory,
} from '../services/sessionNotesService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

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
  const [recommendations, setRecommendations] = useState<StyleRecommendation[]>([]);
  const [deliverables, setDeliverables] = useState<SessionDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>('observation');
  const [activeTab, setActiveTab] = useState<'notes' | 'recommendations' | 'deliverables'>('notes');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      
      // Create mock data if this is a new session
      await sessionNotesService.createMockSessionData(sessionId);
      
      const [notesData, recsData, delsData] = await Promise.all([
        sessionNotesService.getSessionNotes(sessionId),
        sessionNotesService.getRecommendations(sessionId),
        sessionNotesService.getDeliverables(sessionId),
      ]);

      setNotes(notesData);
      setRecommendations(recsData);
      setDeliverables(delsData);
    } catch (error) {
      console.error('Error loading session data:', error);
      showToast('Failed to load session notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      showToast('Please enter note content', 'error');
      return;
    }

    try {
      const note = await sessionNotesService.addNote(
        sessionId,
        newNoteContent,
        selectedCategory,
        'user'
      );

      setNotes([...notes, note]);
      setNewNoteContent('');
      setShowAddNote(false);
      showToast('Note added successfully', 'success');
    } catch (error) {
      console.error('Error adding note:', error);
      showToast('Failed to add note', 'error');
    }
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

  const handleExportNotes = async () => {
    try {
      const pdfUrl = await sessionNotesService.exportNotes(sessionId);
      showToast('Notes exported successfully', 'success');
      // In production, would open PDF or share
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
        {note.createdBy === 'user' && (
          <TouchableOpacity onPress={() =>handleDeleteNote(note.id)}>
            <Text style={styles.deleteButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.noteContent}>{note.content}</Text>
      <View style={styles.noteFooter}>
        <Text style={styles.noteAuthor}>
          {note.createdBy === 'stylist' ? ' Stylist' : ' You'}
        </Text>
        <Text style={styles.noteDate}>
          {new Date(note.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderRecommendation = (rec: StyleRecommendation) => (
    <View key={rec.id} style={styles.recommendationCard}>
      <View style={styles.recHeader}>
        <Text style={styles.recTitle}>{rec.title}</Text>
        <View style={[styles.priorityBadge, styles[`priority${rec.priority}`]]}>
          <Text style={styles.priorityText}>{rec.priority}</Text>
        </View>
      </View>
      <Text style={styles.recDescription}>{rec.description}</Text>
      <View style={styles.recFooter}>
        <View style={styles.recCategory}>
          <Text style={styles.recCategoryText}>{rec.category}</Text>
        </View>
      </View>
    </View>
  );

  const renderDeliverable = (del: SessionDeliverable) => (
    <View key={del.id} style={styles.deliverableCard}>
      <View style={styles.delHeader}>
        <Text style={styles.delIcon}>
          {del.type === 'lookbook' ? '' : del.type === 'shopping-list' ? '' : del.type === 'style-guide' ? '' : ''}
        </Text>
        <View style={styles.delInfo}>
          <Text style={styles.delTitle}>{del.title}</Text>
          <Text style={styles.delType}>{del.type.replace('-', ' ')}</Text>
        </View>
      </View>
      <Text style={styles.delDescription}>{del.description}</Text>
      {del.items && del.items.length >0 && (
        <View style={styles.delItems}>
          {del.items.map((item, index) => (
            <Text key={index} style={styles.delItem}>• {item}</Text>
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.downloadButton}>
        <Text style={styles.downloadButtonText}>Download</Text>
      </TouchableOpacity>
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
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Session Notes</Text>
        <TouchableOpacity onPress={handleExportNotes}>
                  </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
          onPress={() =>setActiveTab('notes')}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Notes ({notes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommendations' && styles.tabActive]}
          onPress={() =>setActiveTab('recommendations')}
        >
          <Text style={[styles.tabText, activeTab === 'recommendations' && styles.tabTextActive]}>Recommendations ({recommendations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deliverables' && styles.tabActive]}
          onPress={() =>setActiveTab('deliverables')}
        >
          <Text style={[styles.tabText, activeTab === 'deliverables' && styles.tabTextActive]}>Deliverables ({deliverables.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'notes' && (
          <View style={styles.notesContainer}>
            {notes.map(renderNote)}
            {notes.length === 0 && (
              <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No notes yet</Text>
                <Text style={styles.emptySubtext}>Add notes during your session</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'recommendations' && (
          <View style={styles.recommendationsContainer}>
            {recommendations.map(renderRecommendation)}
            {recommendations.length === 0 && (
              <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No recommendations yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'deliverables' && (
          <View style={styles.deliverablesContainer}>
            {deliverables.map(renderDeliverable)}
            {deliverables.length === 0 && (
              <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No deliverables yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Note Button */}
      {activeTab === 'notes' && (
        <TouchableOpacity style={styles.fab} onPress={() =>setShowAddNote(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add Note Modal */}
      <Modal
        visible={showAddNote}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>setShowAddNote(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() =>setShowAddNote(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TouchableOpacity onPress={handleAddNote}>
              <Text style={styles.modalSave}>Save</Text>
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
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
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
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
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
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  exportButton: {
    fontSize: 20,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  content: {
    flex: 1,
  },
  notesContainer: {
    padding: 20,
  },
  noteCard: {
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
  deleteButton: {
    fontSize: 18,
    color: colors.inkFaint,
  },
  noteContent: {
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
    fontSize: 12,
    color: colors.inkMuted,
  },
  noteDate: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  recommendationsContainer: {
    padding: 20,
  },
  recommendationCard: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityhigh: {
    backgroundColor: colors.sand,
  },
  prioritymedium: {
    backgroundColor: colors.sand,
  },
  prioritylow: {
    backgroundColor: colors.sand,
  },
  priorityText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  recDescription: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  recFooter: {
    flexDirection: 'row',
  },
  recCategory: {
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recCategoryText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontFamily: fonts.sansMedium,
  },
  deliverablesContainer: {
    padding: 20,
  },
  deliverableCard: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  delHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  delIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  delInfo: {
    flex: 1,
  },
  delTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  delType: {
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  delDescription: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  delItems: {
    backgroundColor: colors.paper,
    padding: 12,
    marginBottom: 12,
  },
  delItem: {
    fontSize: 13,
    color: colors.ink,
    marginBottom: 4,
  },
  downloadButton: {
    backgroundColor: colors.ink,
    padding: 12,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: colors.white,
    fontFamily: fonts.sans,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  modalClose: {
    fontSize: 24,
    color: colors.inkMuted,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  modalSave: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
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
    backgroundColor: colors.paper,
    padding: 16,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
    minHeight: 150,
  },
});
