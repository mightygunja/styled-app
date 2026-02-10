/**
 * Session Notes Service
 * 
 * Manages session notes, recommendations, and deliverables
 * for styling sessions.
 */

export interface SessionNote {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  category: NoteCategory;
  createdBy: 'user' | 'stylist';
}

export type NoteCategory = 
  | 'observation'
  | 'recommendation'
  | 'action-item'
  | 'style-tip'
  | 'product-suggestion';

export interface StyleRecommendation {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  category: 'color' | 'style' | 'fit' | 'occasion' | 'accessory';
  priority: 'high' | 'medium' | 'low';
  imageUrl?: string;
  productLinks?: string[];
  createdAt: string;
}

export interface SessionDeliverable {
  id: string;
  sessionId: string;
  type: 'lookbook' | 'shopping-list' | 'style-guide' | 'capsule-plan';
  title: string;
  description: string;
  fileUrl?: string;
  items?: any[];
  createdAt: string;
}

export interface SessionSummary {
  sessionId: string;
  keyTakeaways: string[];
  recommendations: StyleRecommendation[];
  actionItems: string[];
  nextSteps: string[];
  stylistNotes: string;
}

class SessionNotesService {
  private notes: Map<string, SessionNote[]> = new Map();
  private recommendations: Map<string, StyleRecommendation[]> = new Map();
  private deliverables: Map<string, SessionDeliverable[]> = new Map();

  /**
   * Add a note to a session
   */
  async addNote(
    sessionId: string,
    content: string,
    category: NoteCategory,
    createdBy: 'user' | 'stylist'
  ): Promise<SessionNote> {
    const note: SessionNote = {
      id: `note-${Date.now()}`,
      sessionId,
      content,
      category,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sessionNotes = this.notes.get(sessionId) || [];
    sessionNotes.push(note);
    this.notes.set(sessionId, sessionNotes);

    // In production, would save to backend
    await new Promise(resolve => setTimeout(resolve, 300));

    return note;
  }

  /**
   * Get all notes for a session
   */
  async getSessionNotes(sessionId: string): Promise<SessionNote[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.notes.get(sessionId) || [];
  }

  /**
   * Update a note
   */
  async updateNote(noteId: string, content: string): Promise<SessionNote | null> {
    for (const [sessionId, notes] of this.notes.entries()) {
      const noteIndex = notes.findIndex(n => n.id === noteId);
      if (noteIndex !== -1) {
        notes[noteIndex].content = content;
        notes[noteIndex].updatedAt = new Date().toISOString();
        
        await new Promise(resolve => setTimeout(resolve, 300));
        return notes[noteIndex];
      }
    }
    return null;
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<boolean> {
    for (const [sessionId, notes] of this.notes.entries()) {
      const noteIndex = notes.findIndex(n => n.id === noteId);
      if (noteIndex !== -1) {
        notes.splice(noteIndex, 1);
        this.notes.set(sessionId, notes);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
    }
    return false;
  }

  /**
   * Add a style recommendation
   */
  async addRecommendation(
    sessionId: string,
    recommendation: Omit<StyleRecommendation, 'id' | 'sessionId' | 'createdAt'>
  ): Promise<StyleRecommendation> {
    const newRecommendation: StyleRecommendation = {
      id: `rec-${Date.now()}`,
      sessionId,
      ...recommendation,
      createdAt: new Date().toISOString(),
    };

    const sessionRecs = this.recommendations.get(sessionId) || [];
    sessionRecs.push(newRecommendation);
    this.recommendations.set(sessionId, sessionRecs);

    await new Promise(resolve => setTimeout(resolve, 300));

    return newRecommendation;
  }

  /**
   * Get recommendations for a session
   */
  async getRecommendations(sessionId: string): Promise<StyleRecommendation[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.recommendations.get(sessionId) || [];
  }

  /**
   * Add a deliverable
   */
  async addDeliverable(
    sessionId: string,
    deliverable: Omit<SessionDeliverable, 'id' | 'sessionId' | 'createdAt'>
  ): Promise<SessionDeliverable> {
    const newDeliverable: SessionDeliverable = {
      id: `del-${Date.now()}`,
      sessionId,
      ...deliverable,
      createdAt: new Date().toISOString(),
    };

    const sessionDels = this.deliverables.get(sessionId) || [];
    sessionDels.push(newDeliverable);
    this.deliverables.set(sessionId, sessionDels);

    await new Promise(resolve => setTimeout(resolve, 300));

    return newDeliverable;
  }

  /**
   * Get deliverables for a session
   */
  async getDeliverables(sessionId: string): Promise<SessionDeliverable[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.deliverables.get(sessionId) || [];
  }

  /**
   * Generate session summary
   */
  async generateSummary(sessionId: string): Promise<SessionSummary> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const notes = await this.getSessionNotes(sessionId);
    const recommendations = await this.getRecommendations(sessionId);

    // Extract key takeaways from notes
    const keyTakeaways = notes
      .filter(n => n.category === 'observation' || n.category === 'style-tip')
      .map(n => n.content)
      .slice(0, 5);

    // Extract action items
    const actionItems = notes
      .filter(n => n.category === 'action-item')
      .map(n => n.content);

    // Generate next steps
    const nextSteps = [
      'Review style recommendations',
      'Shop for suggested items',
      'Try new outfit combinations',
      'Schedule follow-up session',
    ];

    // Compile stylist notes
    const stylistNotes = notes
      .filter(n => n.createdBy === 'stylist')
      .map(n => n.content)
      .join('\n\n');

    return {
      sessionId,
      keyTakeaways,
      recommendations,
      actionItems,
      nextSteps,
      stylistNotes,
    };
  }

  /**
   * Export session notes as PDF (mock)
   */
  async exportNotes(sessionId: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In production, would generate actual PDF
    return `https://styled.app/sessions/${sessionId}/notes.pdf`;
  }

  /**
   * Share notes with user
   */
  async shareNotes(sessionId: string, email: string): Promise<boolean> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Session notes shared with ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to share notes:', error);
      return false;
    }
  }

  /**
   * Get notes by category
   */
  async getNotesByCategory(sessionId: string, category: NoteCategory): Promise<SessionNote[]> {
    const notes = await this.getSessionNotes(sessionId);
    return notes.filter(n => n.category === category);
  }

  /**
   * Search notes
   */
  async searchNotes(sessionId: string, query: string): Promise<SessionNote[]> {
    const notes = await this.getSessionNotes(sessionId);
    const lowerQuery = query.toLowerCase();
    return notes.filter(n => n.content.toLowerCase().includes(lowerQuery));
  }

  /**
   * Create mock session data for testing
   */
  async createMockSessionData(sessionId: string): Promise<void> {
    // Add sample notes
    await this.addNote(
      sessionId,
      'Client prefers minimalist style with neutral colors',
      'observation',
      'stylist'
    );
    
    await this.addNote(
      sessionId,
      'Focus on building a capsule wardrobe with 20-30 pieces',
      'recommendation',
      'stylist'
    );
    
    await this.addNote(
      sessionId,
      'Purchase white button-down shirt and black trousers',
      'action-item',
      'stylist'
    );
    
    await this.addNote(
      sessionId,
      'Invest in quality basics that can be mixed and matched',
      'style-tip',
      'stylist'
    );

    // Add sample recommendations
    await this.addRecommendation(sessionId, {
      title: 'Build a Neutral Color Palette',
      description: 'Focus on black, white, gray, and beige as your foundation colors. These work well together and are versatile.',
      category: 'color',
      priority: 'high',
    });

    await this.addRecommendation(sessionId, {
      title: 'Invest in Tailored Pieces',
      description: 'Well-fitted blazers and trousers will elevate your entire wardrobe. Consider getting items tailored for the perfect fit.',
      category: 'fit',
      priority: 'high',
    });

    await this.addRecommendation(sessionId, {
      title: 'Accessorize Strategically',
      description: 'A quality watch, simple jewelry, and a leather bag can transform basic outfits.',
      category: 'accessory',
      priority: 'medium',
    });

    // Add sample deliverable
    await this.addDeliverable(sessionId, {
      type: 'shopping-list',
      title: 'Essential Items Shopping List',
      description: 'Curated list of must-have items to complete your capsule wardrobe',
      items: [
        'White button-down shirt',
        'Black trousers',
        'Navy blazer',
        'Quality leather belt',
        'Minimalist watch',
      ],
    });
  }
}

export const sessionNotesService = new SessionNotesService();
