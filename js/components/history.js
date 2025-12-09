/**
 * Decision History & Regret Tracker
 * Tracks past decisions and prompts for outcome feedback
 */

const History = {
    FOLLOWUP_DAYS: [7, 30, 90], // Days after decision to prompt for feedback

    /**
     * Initialize history tracking
     */
    init() {
        this.checkPendingFollowups();
    },

    /**
     * Get all decision outcomes
     */
    getOutcomes() {
        try {
            const data = localStorage.getItem('decisionmaker_outcomes');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    },

    /**
     * Save outcome feedback
     */
    saveOutcome(decisionId, outcome) {
        try {
            const outcomes = this.getOutcomes();
            outcomes[decisionId] = {
                ...outcome,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('decisionmaker_outcomes', JSON.stringify(outcomes));
            return true;
        } catch (e) {
            console.error('Error saving outcome:', e);
            return false;
        }
    },

    /**
     * Check for pending followups
     */
    checkPendingFollowups() {
        const decisions = Storage.getDecisions();
        const outcomes = this.getOutcomes();
        const now = new Date();

        const pending = decisions.filter(d => {
            if (!d.createdAt) return false;
            const daysSince = Math.floor((now - new Date(d.createdAt)) / (1000 * 60 * 60 * 24));
            const outcome = outcomes[d.id];

            // Check if any followup milestone has been reached but not recorded
            return this.FOLLOWUP_DAYS.some(milestone =>
                daysSince >= milestone && (!outcome || !outcome[`feedback_${milestone}d`])
            );
        });

        if (pending.length > 0) {
            this.showFollowupPrompt(pending[0]);
        }
    },

    /**
     * Show followup prompt
     */
    showFollowupPrompt(decision) {
        const toast = document.createElement('div');
        toast.className = 'history-prompt';
        toast.innerHTML = `
            <div class="history-prompt-content">
                <p>📊 How did <strong>"${this.escapeHtml(decision.title)}"</strong> turn out?</p>
                <div class="history-prompt-actions">
                    <button class="btn btn-secondary" onclick="History.openFeedbackModal('${decision.id}')">Give Feedback</button>
                    <button class="btn btn-ghost" onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
                </div>
            </div>
        `;
        document.body.appendChild(toast);
    },

    /**
     * Open feedback modal
     */
    openFeedbackModal(decisionId) {
        const decision = Storage.getDecision(decisionId);
        if (!decision) return;

        // Remove any existing prompt
        document.querySelector('.history-prompt')?.remove();

        // Create modal
        const modal = document.createElement('dialog');
        modal.id = 'feedback-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📊 Decision Outcome</h3>
                    <button class="btn btn-icon modal-close">&times;</button>
                </div>
                <div class="feedback-body">
                    <p class="feedback-title">${this.escapeHtml(decision.title)}</p>
                    <p class="feedback-made">Made on ${new Date(decision.createdAt).toLocaleDateString()}</p>
                    
                    <label>How satisfied are you with this decision?</label>
                    <div class="rating-stars" id="rating-stars">
                        ${[1, 2, 3, 4, 5].map(n => `<button class="star-btn" data-rating="${n}">⭐</button>`).join('')}
                    </div>
                    <input type="hidden" id="feedback-rating" value="0">
                    
                    <label>What happened?</label>
                    <textarea id="feedback-notes" rows="3" placeholder="Optional notes about the outcome..."></textarea>
                    
                    <label>Would you make the same decision again?</label>
                    <div class="feedback-choices">
                        <button class="choice-btn" data-choice="yes">Yes ✓</button>
                        <button class="choice-btn" data-choice="maybe">Maybe</button>
                        <button class="choice-btn" data-choice="no">No ✗</button>
                    </div>
                    <input type="hidden" id="feedback-choice" value="">
                    
                    <button class="btn btn-primary" style="width:100%;margin-top:var(--spacing-md)" onclick="History.submitFeedback('${decisionId}')">
                        Save Feedback
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.showModal();

        // Bind events
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.close();
            modal.remove();
        });

        modal.querySelectorAll('.star-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rating = parseInt(btn.dataset.rating);
                document.getElementById('feedback-rating').value = rating;
                modal.querySelectorAll('.star-btn').forEach((b, i) => {
                    b.classList.toggle('active', i < rating);
                });
            });
        });

        modal.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('feedback-choice').value = btn.dataset.choice;
                modal.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },

    /**
     * Submit feedback
     */
    submitFeedback(decisionId) {
        const rating = parseInt(document.getElementById('feedback-rating')?.value) || 0;
        const notes = document.getElementById('feedback-notes')?.value || '';
        const choice = document.getElementById('feedback-choice')?.value || '';

        if (rating === 0) {
            UI.toast('Please select a rating', 'warning');
            return;
        }

        const outcome = this.getOutcomes()[decisionId] || {};
        const daysSince = Math.floor((new Date() - new Date(Storage.getDecision(decisionId)?.createdAt)) / (1000 * 60 * 60 * 24));

        const feedback = {
            rating,
            notes,
            wouldRepeat: choice,
            recordedAt: new Date().toISOString(),
            daysAfterDecision: daysSince
        };

        // Find appropriate milestone
        const milestone = this.FOLLOWUP_DAYS.find(m => daysSince >= m) || 'latest';
        outcome[`feedback_${milestone}d`] = feedback;

        if (this.saveOutcome(decisionId, outcome)) {
            UI.toast('Feedback saved! Thanks for tracking your decisions.', 'success');
            document.getElementById('feedback-modal')?.close();
            document.getElementById('feedback-modal')?.remove();
        }
    },

    /**
     * Show history view (all past decisions with outcomes)
     */
    showHistoryView() {
        const decisions = Storage.getDecisions();
        const outcomes = this.getOutcomes();

        let html = '<div class="history-timeline">';

        if (decisions.length === 0) {
            html += '<p class="empty-state">No decisions recorded yet.</p>';
        } else {
            decisions.forEach(d => {
                const outcome = outcomes[d.id];
                const latestFeedback = outcome ? Object.keys(outcome)
                    .filter(k => k.startsWith('feedback_'))
                    .map(k => outcome[k])
                    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))[0] : null;

                html += `
                    <div class="history-item" data-id="${d.id}">
                        <div class="history-date">${new Date(d.createdAt).toLocaleDateString()}</div>
                        <div class="history-content">
                            <h4>${this.escapeHtml(d.title)}</h4>
                            <p>Winner: ${d.results?.rankings?.[0]?.name || 'N/A'}</p>
                            ${latestFeedback ? `
                                <div class="history-feedback">
                                    ${'⭐'.repeat(latestFeedback.rating)} · 
                                    ${latestFeedback.wouldRepeat === 'yes' ? '✓ Would repeat' :
                            latestFeedback.wouldRepeat === 'no' ? '✗ Wouldn\'t repeat' : 'Uncertain'}
                                </div>
                            ` : '<p class="no-feedback">No feedback yet</p>'}
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        return html;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    History.init();
});
