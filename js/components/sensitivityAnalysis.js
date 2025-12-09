/**
 * Sensitivity Analysis Component
 * Calculates and visualizes decision robustness and tipping points
 */

const SensitivityAnalysis = {
    /**
     * Analyze sensitivity of the decision
     * Returns tipping points - weight changes that would change the winner
     */
    analyze(rankings, criteria, options) {
        const winner = rankings[0];
        const runnerUp = rankings[1];

        if (!winner || !runnerUp) return null;

        const tippingPoints = [];
        const gapToRunnerUp = winner.normalizedScore - runnerUp.normalizedScore;

        // Analyze each criterion to find tipping points
        criteria.forEach(criterion => {
            const winnerScore = winner.criteriaScores.find(cs => cs.criterionId === criterion.id)?.score || 5;
            const runnerUpScore = runnerUp.criteriaScores.find(cs => cs.criterionId === criterion.id)?.score || 5;
            const scoreDiff = winnerScore - runnerUpScore;

            // Calculate sensitivity - how much does this criterion favor the winner?
            const currentWeight = criterion.weight;
            const maxWeight = 10;
            const minWeight = 1;

            // Simulate weight changes to find tipping point
            let tippingWeight = null;
            let direction = null;

            if (scoreDiff > 0) {
                // Winner is better here - decreasing weight might flip the decision
                for (let w = currentWeight - 1; w >= minWeight; w--) {
                    const newRankings = this.simulateWithWeight(rankings, criteria, criterion.id, w);
                    if (newRankings[0].id !== winner.id) {
                        tippingWeight = w;
                        direction = 'decrease';
                        break;
                    }
                }
            } else if (scoreDiff < 0) {
                // Winner is worse here - increasing weight might flip the decision
                for (let w = currentWeight + 1; w <= maxWeight; w++) {
                    const newRankings = this.simulateWithWeight(rankings, criteria, criterion.id, w);
                    if (newRankings[0].id !== winner.id) {
                        tippingWeight = w;
                        direction = 'increase';
                        break;
                    }
                }
            }

            tippingPoints.push({
                criterionId: criterion.id,
                criterionName: criterion.name,
                currentWeight: currentWeight,
                winnerScore: winnerScore,
                runnerUpScore: runnerUpScore,
                scoreDiff: scoreDiff,
                tippingWeight: tippingWeight,
                direction: direction,
                isSensitive: tippingWeight !== null && Math.abs(tippingWeight - currentWeight) <= 3
            });
        });

        // Calculate overall robustness score (0-100)
        const sensitiveCriteria = tippingPoints.filter(tp => tp.isSensitive);
        const robustness = Math.max(0, 100 - (sensitiveCriteria.length * 20) - (gapToRunnerUp < 0.5 ? 20 : 0));

        return {
            winner: winner,
            runnerUp: runnerUp,
            gapToRunnerUp: gapToRunnerUp,
            robustness: robustness,
            tippingPoints: tippingPoints,
            sensitiveCriteria: sensitiveCriteria,
            isRobust: robustness >= 60
        };
    },

    /**
     * Simulate rankings with a modified weight
     */
    simulateWithWeight(rankings, criteria, criterionId, newWeight) {
        const modifiedCriteria = criteria.map(c =>
            c.id === criterionId ? { ...c, weight: newWeight } : { ...c }
        );

        // Recalculate scores
        const options = rankings.map(r => ({
            id: r.id,
            name: r.name,
            scores: r.criteriaScores.reduce((acc, cs) => {
                acc[cs.criterionId] = cs.score;
                return acc;
            }, {})
        }));

        return Scoring.generateRankings(options, modifiedCriteria).rankings;
    },

    /**
     * Render sensitivity analysis panel
     */
    render(analysis, containerId = 'sensitivity-container') {
        const container = document.getElementById(containerId);
        if (!container || !analysis) return;

        const robustnessClass = analysis.robustness >= 70 ? 'high' : analysis.robustness >= 40 ? 'medium' : 'low';
        const robustnessLabel = analysis.robustness >= 70 ? 'Robust' : analysis.robustness >= 40 ? 'Moderate' : 'Fragile';

        let html = `
            <div class="sensitivity-summary">
                <div class="robustness-meter">
                    <div class="robustness-label">Decision Robustness</div>
                    <div class="robustness-bar">
                        <div class="robustness-fill ${robustnessClass}" style="width: ${analysis.robustness}%"></div>
                    </div>
                    <div class="robustness-value ${robustnessClass}">${robustnessLabel} (${Math.round(analysis.robustness)}%)</div>
                </div>
                <div class="gap-info">
                    <strong>${this.escapeHtml(analysis.winner.name)}</strong> leads 
                    <strong>${this.escapeHtml(analysis.runnerUp.name)}</strong> by 
                    <span class="${analysis.gapToRunnerUp < 0.5 ? 'close-gap' : ''}">${analysis.gapToRunnerUp.toFixed(2)} points</span>
                </div>
            </div>
        `;

        // Tipping points section
        const sensitiveTPs = analysis.tippingPoints.filter(tp => tp.tippingWeight !== null);

        if (sensitiveTPs.length > 0) {
            html += `
                <div class="tipping-points">
                    <h4>⚠️ Tipping Points</h4>
                    <p class="tipping-desc">Weight changes that would change the winner:</p>
                    <div class="tipping-list">
            `;

            sensitiveTPs.forEach(tp => {
                const changeNeeded = Math.abs(tp.tippingWeight - tp.currentWeight);
                html += `
                    <div class="tipping-item ${tp.isSensitive ? 'sensitive' : ''}">
                        <span class="tipping-criterion">${this.escapeHtml(tp.criterionName)}</span>
                        <span class="tipping-change">
                            ${tp.direction === 'decrease' ? '↓' : '↑'} 
                            ${tp.currentWeight} → ${tp.tippingWeight}
                            <small>(${changeNeeded} ${changeNeeded === 1 ? 'step' : 'steps'})</small>
                        </span>
                    </div>
                `;
            });

            html += '</div></div>';
        } else {
            html += `
                <div class="no-tipping-points">
                    <span>✅</span>
                    <p>Decision is stable - no single weight change would change the winner.</p>
                </div>
            `;
        }

        // Criterion impact visualization
        html += `
            <div class="criterion-impact">
                <h4>Criterion Impact</h4>
                <div class="impact-bars">
        `;

        analysis.tippingPoints
            .sort((a, b) => Math.abs(b.scoreDiff) - Math.abs(a.scoreDiff))
            .forEach(tp => {
                const impactWidth = Math.min(100, Math.abs(tp.scoreDiff) * 15);
                const impactClass = tp.scoreDiff > 0 ? 'positive' : tp.scoreDiff < 0 ? 'negative' : 'neutral';

                html += `
                    <div class="impact-row">
                        <span class="impact-name">${this.escapeHtml(tp.criterionName)}</span>
                        <div class="impact-bar-container">
                            <div class="impact-bar ${impactClass}" style="width: ${impactWidth}%"></div>
                        </div>
                        <span class="impact-value ${impactClass}">
                            ${tp.scoreDiff > 0 ? '+' : ''}${tp.scoreDiff}
                        </span>
                    </div>
                `;
            });

        html += '</div></div>';

        container.innerHTML = html;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
