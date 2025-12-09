/**
 * Results Component
 * Renders the results and recommendations
 */

const Results = {
    currentDecision: null,

    /**
     * Render results page
     */
    render(results, options, criteria, meta) {
        this.currentDecision = {
            ...meta,
            options,
            criteria,
            results
        };

        this.renderConfidence(results.confidence);
        this.renderRankings(results.rankings);
        this.renderRationale(results.analysis);
        Matrix.renderResults(results.rankings, criteria);

        // Render visual comparison
        if (typeof VisualComparison !== 'undefined') {
            VisualComparison.render(results.rankings, criteria);
        }

        // Render sensitivity analysis
        if (typeof SensitivityAnalysis !== 'undefined') {
            const analysis = SensitivityAnalysis.analyze(results.rankings, criteria, options);
            if (analysis) {
                SensitivityAnalysis.render(analysis);
            }
        }
    },

    /**
     * Render confidence indicator
     */
    renderConfidence(confidence) {
        const container = document.getElementById('confidence-indicator');
        if (!container) return;

        const valueEl = container.querySelector('.confidence-value');
        const dotsEl = container.querySelector('.confidence-dots');

        if (valueEl) {
            valueEl.textContent = confidence.label;
            valueEl.className = `confidence-value ${confidence.level}`;
        }

        if (dotsEl) {
            const dotCount = confidence.level === 'high' ? 4 : confidence.level === 'medium' ? 3 : 2;
            dotsEl.innerHTML = Array(4).fill(0).map((_, i) =>
                `<span class="confidence-dot ${i < dotCount ? 'filled' : ''}" style="color: var(--color-${confidence.level === 'high' ? 'success' : confidence.level === 'medium' ? 'warning' : 'danger'})"></span>`
            ).join('');
        }
    },

    /**
     * Render ranking cards
     */
    renderRankings(rankings) {
        const container = document.getElementById('rankings-container');
        if (!container) return;

        container.innerHTML = rankings.map((item, index) => {
            const isWinner = index === 0;
            const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-n';

            // Find pros (high scores) and cons (low scores)
            const pros = item.criteriaScores
                .filter(cs => cs.score >= 7)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map(cs => `${cs.criterionName} (${cs.score}/10)`);

            const cons = item.criteriaScores
                .filter(cs => cs.score <= 4)
                .sort((a, b) => a.score - b.score)
                .slice(0, 3)
                .map(cs => `${cs.criterionName} (${cs.score}/10)`);

            return `
                <div class="ranking-card ${isWinner ? 'winner' : ''} animate-fade-in" style="animation-delay: ${index * 100}ms">
                    <div class="ranking-badge ${rankClass}">
                        ${isWinner ? '🏆' : `#${item.rank}`}
                    </div>
                    <div class="ranking-content">
                        <div class="ranking-header">
                            <span class="ranking-name">
                                ${isWinner ? '<span class="trophy">🏆</span>' : ''}
                                ${this.escapeHtml(item.name)}
                            </span>
                            <span class="ranking-score">
                                ${item.normalizedScore.toFixed(1)}<small>/10</small>
                            </span>
                        </div>
                        <div class="ranking-pros-cons">
                            ${pros.length > 0 ? `
                                <div class="pros-list">
                                    ${pros.map(p => `<span class="pro-item">✅ ${p}</span>`).join('')}
                                </div>
                            ` : ''}
                            ${cons.length > 0 ? `
                                <div class="cons-list">
                                    ${cons.map(c => `<span class="con-item">❌ ${c}</span>`).join('')}
                                </div>
                            ` : ''}
                            ${pros.length === 0 && cons.length === 0 ? '<span class="neutral-note">Average across all criteria</span>' : ''}
                        </div>
                        ${isWinner ? '<div class="winner-badge">🎯 Recommended Choice</div>' : ''}
                        ${index === 1 ? '<div class="fallback-badge">↩️ Safe Alternative</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render rationale
     */
    renderRationale(analysis) {
        const container = document.getElementById('rationale-content');
        if (!container || !analysis) return;

        let html = `<p>${analysis.rationale}</p>`;

        if (analysis.tradeoffs && analysis.tradeoffs.length > 0) {
            html += '<p style="margin-top: var(--spacing-md);"><strong>Trade-offs by option:</strong></p>';
            html += '<ul style="list-style: none; padding: 0; margin-top: var(--spacing-sm);">';

            analysis.tradeoffs.forEach(tradeoff => {
                const prosText = tradeoff.pros.length > 0 ? `✓ ${tradeoff.pros.join(', ')}` : '';
                const consText = tradeoff.cons.length > 0 ? `⚠ ${tradeoff.cons.join(', ')}` : '';

                if (prosText || consText) {
                    html += `
                        <li style="margin-bottom: var(--spacing-xs);">
                            <strong>${this.escapeHtml(tradeoff.optionName)}:</strong>
                            ${prosText} ${prosText && consText ? ' | ' : ''} ${consText}
                        </li>
                    `;
                }
            });

            html += '</ul>';
        }

        container.innerHTML = html;
    },

    /**
     * Save current decision
     */
    saveCurrentDecision() {
        if (!this.currentDecision) {
            UI.toast('No decision to save', 'warning');
            return;
        }

        const decision = {
            id: this.currentDecision.id || Storage.generateId(),
            title: this.currentDecision.title,
            options: this.currentDecision.options,
            criteria: this.currentDecision.criteria,
            constraints: this.currentDecision.constraints,
            results: {
                rankings: this.currentDecision.results.rankings.map(r => ({
                    id: r.id,
                    name: r.name,
                    rank: r.rank,
                    normalizedScore: r.normalizedScore
                })),
                confidence: this.currentDecision.results.confidence
            }
        };

        if (Storage.saveDecision(decision)) {
            this.currentDecision.id = decision.id;
            UI.toast('Decision saved successfully!', 'success');
        } else {
            UI.toast('Failed to save decision', 'error');
        }
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
