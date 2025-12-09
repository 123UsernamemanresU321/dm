/**
 * Storage Module
 * Handles localStorage operations for saving/loading decisions
 */

const Storage = {
    KEYS: {
        DECISIONS: 'decisionmaker_decisions',
        SETTINGS: 'decisionmaker_settings'
    },

    /**
     * Generate a unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Get all saved decisions
     */
    getDecisions() {
        try {
            const data = localStorage.getItem(this.KEYS.DECISIONS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading decisions:', e);
            return [];
        }
    },

    /**
     * Save a decision
     */
    saveDecision(decision) {
        try {
            const decisions = this.getDecisions();
            const existingIndex = decisions.findIndex(d => d.id === decision.id);

            if (existingIndex >= 0) {
                decisions[existingIndex] = {
                    ...decision,
                    updatedAt: new Date().toISOString()
                };
            } else {
                decisions.unshift({
                    ...decision,
                    id: decision.id || this.generateId(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            localStorage.setItem(this.KEYS.DECISIONS, JSON.stringify(decisions));
            return true;
        } catch (e) {
            console.error('Error saving decision:', e);
            return false;
        }
    },

    /**
     * Get a decision by ID
     */
    getDecision(id) {
        const decisions = this.getDecisions();
        return decisions.find(d => d.id === id);
    },

    /**
     * Delete a decision
     */
    deleteDecision(id) {
        try {
            const decisions = this.getDecisions().filter(d => d.id !== id);
            localStorage.setItem(this.KEYS.DECISIONS, JSON.stringify(decisions));
            return true;
        } catch (e) {
            console.error('Error deleting decision:', e);
            return false;
        }
    },

    /**
     * Get settings
     */
    getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            return data ? JSON.parse(data) : { theme: 'dark' };
        } catch (e) {
            return { theme: 'dark' };
        }
    },

    /**
     * Save settings
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Error saving settings:', e);
            return false;
        }
    },

    /**
     * Export decision as JSON
     */
    exportAsJson(decision) {
        const dataStr = JSON.stringify(decision, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `decision-${decision.title.replace(/\s+/g, '-').toLowerCase()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }
};
