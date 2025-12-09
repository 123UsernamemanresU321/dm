/**
 * Collaborative Decision Making
 * Enables sharing and multi-user voting on decisions
 */

const Collaboration = {
    /**
     * Generate shareable link for current decision
     */
    generateShareLink(decision) {
        const data = {
            t: decision.title,
            o: decision.options.map(o => o.name),
            c: decision.criteria.map(c => ({ n: c.name, w: c.weight }))
        };

        const encoded = btoa(JSON.stringify(data));
        return `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    },

    /**
     * Load shared decision from URL
     */
    loadFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const shareData = params.get('share');

        if (!shareData) return false;

        try {
            const data = JSON.parse(atob(shareData));

            // Apply the shared decision
            DecisionForm.reset();

            if (data.t) {
                DecisionForm.state.title = data.t;
                document.getElementById('decision-title').value = data.t;
            }

            if (data.o) {
                data.o.forEach(name => DecisionForm.addOption(name));
            }

            if (data.c) {
                document.getElementById('criteria-list').innerHTML = '';
                DecisionForm.state.criteria = [];
                data.c.forEach(c => DecisionForm.addCriterion(c.n, c.w));
            }

            DecisionForm.updateMatrix();
            DecisionForm.updateCounts();
            DecisionForm.validateForm();

            UI.toast('Shared decision loaded! Add your scores.', 'success');

            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);

            return true;
        } catch (e) {
            console.error('Failed to load shared decision:', e);
            return false;
        }
    },

    /**
     * Show share modal
     */
    showShareModal() {
        const decision = DecisionForm.getDecisionData();
        if (!decision.title) {
            UI.toast('Please enter a decision title first', 'warning');
            return;
        }

        const link = this.generateShareLink(decision);

        const modal = document.createElement('dialog');
        modal.id = 'share-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔗 Share Decision</h3>
                    <button class="btn btn-icon modal-close">&times;</button>
                </div>
                <div class="share-body">
                    <p>Share this link to let others score the same options:</p>
                    <div class="share-link-box">
                        <input type="text" id="share-link" value="${link}" readonly>
                        <button class="btn btn-secondary" onclick="Collaboration.copyLink()">Copy</button>
                    </div>
                    <p class="share-note">Recipients can add their own scores, then compare results.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.showModal();

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.close();
            modal.remove();
        });
    },

    /**
     * Copy link to clipboard
     */
    async copyLink() {
        const input = document.getElementById('share-link');
        if (!input) return;

        try {
            await navigator.clipboard.writeText(input.value);
            UI.toast('Link copied to clipboard!', 'success');
        } catch (e) {
            input.select();
            document.execCommand('copy');
            UI.toast('Link copied!', 'success');
        }
    }
};

// Check for shared decision on load
document.addEventListener('DOMContentLoaded', () => {
    Collaboration.loadFromUrl();
});
