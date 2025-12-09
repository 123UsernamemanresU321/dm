/**
 * The Decision-Maker - Main Application
 * Initializes all components and handles global events
 */

const App = {
    init() {
        // Apply saved theme
        UI.applyTheme();

        // Initialize modals
        UI.initModals();

        // Initialize form
        DecisionForm.init();

        // Bind global events
        this.bindEvents();

        console.log('The Decision-Maker initialized');
    },

    bindEvents() {
        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            const newTheme = UI.toggleTheme();
            UI.toast(`Switched to ${newTheme} mode`, 'info');
        });

        // Load decision button
        document.getElementById('load-decision-btn')?.addEventListener('click', () => {
            this.showLoadModal();
        });

        // Save decision button
        document.getElementById('save-decision-btn')?.addEventListener('click', () => {
            Results.saveCurrentDecision();
        });

        // Export PDF button
        document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
            UI.printPage();
        });

        // New decision button
        document.getElementById('new-decision-btn')?.addEventListener('click', () => {
            this.startNewDecision();
        });

        // Back to edit button
        document.getElementById('back-to-edit-btn')?.addEventListener('click', () => {
            UI.hide('#results-section');
            UI.show('#input-section');
            UI.scrollTo('#input-section');
        });

        // AI Suggest Options button
        document.getElementById('ai-suggest-btn')?.addEventListener('click', () => {
            this.aiSuggestOptions();
        });

        // AI Auto-Score button
        document.getElementById('ai-autoscore-btn')?.addEventListener('click', () => {
            this.aiAutoScore();
        });

        // Use Template button
        document.getElementById('use-template-btn')?.addEventListener('click', () => {
            this.showTemplatesModal();
        });
    },

    showTemplatesModal() {
        Templates.renderGrid('templates-list', (templateId) => {
            if (Templates.apply(templateId)) {
                UI.closeModal('templates-modal');
                UI.toast('Template applied! Customize options and scores.', 'success');
            }
        });
        UI.openModal('templates-modal');
    },

    async aiSuggestOptions() {
        const title = DecisionForm.state.title.trim();
        if (!title) {
            UI.toast('Please enter a decision title first', 'warning');
            return;
        }

        const btn = document.getElementById('ai-suggest-btn');
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const existingOptions = DecisionForm.state.options.map(o => o.name).filter(n => n);
            const suggestions = await AI.suggestOptions(title, existingOptions);

            if (Array.isArray(suggestions)) {
                suggestions.forEach(name => {
                    if (name && typeof name === 'string') {
                        DecisionForm.addOption(name.trim());
                    }
                });
                UI.toast(`Added ${suggestions.length} AI suggestions`, 'success');
            }
        } catch (e) {
            UI.toast(e.message, 'error');
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    },

    async aiAutoScore() {
        const { options, criteria, title } = DecisionForm.state;

        if (options.length < 2) {
            UI.toast('Add at least 2 options first', 'warning');
            return;
        }

        if (criteria.length < 1) {
            UI.toast('Add at least 1 criterion first', 'warning');
            return;
        }

        if (options.some(o => !o.name.trim())) {
            UI.toast('Please name all options first', 'warning');
            return;
        }

        const btn = document.getElementById('ai-autoscore-btn');
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const result = await AI.autoScore(title, options, criteria);

            // Update options with AI scores
            result.options.forEach(aiOption => {
                const stateOption = DecisionForm.state.options.find(o => o.id === aiOption.id);
                if (stateOption) {
                    stateOption.scores = aiOption.scores;
                }
            });

            // Re-render the matrix
            DecisionForm.updateMatrix();

            UI.toast('AI scored all options!', 'success');
        } catch (e) {
            UI.toast(e.message, 'error');
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    },

    showLoadModal() {
        const list = document.getElementById('saved-decisions-list');
        const decisions = Storage.getDecisions();

        if (decisions.length === 0) {
            list.innerHTML = '<p class="empty-state">No saved decisions yet.</p>';
        } else {
            list.innerHTML = decisions.map(d => `
                <div class="saved-decision-item" data-id="${d.id}">
                    <div class="saved-decision-info">
                        <div class="saved-decision-title">${this.escapeHtml(d.title)}</div>
                        <div class="saved-decision-date">${UI.formatDate(d.updatedAt)}</div>
                    </div>
                    <div class="saved-decision-actions">
                        <button class="btn btn-icon btn-danger delete-btn" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');

            // Bind click events
            list.querySelectorAll('.saved-decision-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.delete-btn')) {
                        this.loadDecision(item.dataset.id);
                    }
                });

                item.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteDecision(item.dataset.id);
                });
            });
        }

        UI.openModal('load-modal');
    },

    loadDecision(id) {
        const decision = Storage.getDecision(id);
        if (decision) {
            DecisionForm.loadDecision(decision);
            UI.closeModal('load-modal');
            UI.hide('#results-section');
            UI.show('#input-section');
            UI.toast('Decision loaded', 'success');
        }
    },

    deleteDecision(id) {
        if (Storage.deleteDecision(id)) {
            this.showLoadModal(); // Refresh list
            UI.toast('Decision deleted', 'success');
        }
    },

    startNewDecision() {
        DecisionForm.reset();
        DecisionForm.addDefaultCriteria();
        UI.hide('#results-section');
        UI.show('#input-section');
        UI.scrollTo('#input-section');
        UI.toast('Ready for a new decision', 'info');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
