/**
 * Visual Comparison Component
 * Provides radar charts, bar comparisons, and card view for decision results
 */

const VisualComparison = {
    /**
     * Render visual comparison for rankings
     */
    render(rankings, criteria, containerId = 'visual-comparison-container') {
        const container = document.getElementById(containerId);
        if (!container || rankings.length === 0) return;

        container.innerHTML = `
            <div class="visual-tabs">
                <button class="visual-tab active" data-view="radar">Radar Chart</button>
                <button class="visual-tab" data-view="bars">Bar Comparison</button>
                <button class="visual-tab" data-view="cards">Score Cards</button>
            </div>
            <div class="visual-content">
                <div id="visual-radar" class="visual-view active"></div>
                <div id="visual-bars" class="visual-view"></div>
                <div id="visual-cards" class="visual-view"></div>
            </div>
        `;

        // Bind tab events
        container.querySelectorAll('.visual-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                container.querySelectorAll('.visual-tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.visual-view').forEach(v => v.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`visual-${e.target.dataset.view}`).classList.add('active');
            });
        });

        this.renderRadarChart(rankings, criteria);
        this.renderBarComparison(rankings, criteria);
        this.renderScoreCards(rankings, criteria);
    },

    /**
     * Generate SVG radar chart
     */
    renderRadarChart(rankings, criteria) {
        const container = document.getElementById('visual-radar');
        if (!container) return;

        const size = 300;
        const center = size / 2;
        const radius = size / 2 - 40;
        const numAxes = criteria.length;
        const angleStep = (2 * Math.PI) / numAxes;

        // Colors for each option
        const colors = [
            '#6366f1', // Primary purple
            '#10b981', // Green
            '#f59e0b', // Orange
            '#ef4444', // Red
            '#8b5cf6', // Purple
            '#06b6d4', // Cyan
        ];

        // Create SVG
        let svg = `<svg viewBox="0 0 ${size} ${size}" class="radar-chart">`;

        // Draw axis lines and labels
        criteria.forEach((c, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            const labelX = center + (radius + 20) * Math.cos(angle);
            const labelY = center + (radius + 20) * Math.sin(angle);

            // Axis line
            svg += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis"/>`;

            // Label
            const anchor = Math.abs(angle) < 0.1 || Math.abs(angle - Math.PI) < 0.1 ? 'middle' :
                angle > -Math.PI / 2 && angle < Math.PI / 2 ? 'start' : 'end';
            svg += `<text x="${labelX}" y="${labelY}" class="radar-label" text-anchor="${anchor}">${this.truncate(c.name, 12)}</text>`;
        });

        // Draw grid circles
        for (let level = 1; level <= 5; level++) {
            const r = (radius / 5) * level;
            svg += `<circle cx="${center}" cy="${center}" r="${r}" class="radar-grid"/>`;
        }

        // Draw option polygons
        rankings.slice(0, 4).forEach((option, optIdx) => {
            let points = [];
            criteria.forEach((c, i) => {
                const score = option.criteriaScores.find(cs => cs.criterionId === c.id)?.score || 5;
                const normalizedScore = score / 10;
                const angle = i * angleStep - Math.PI / 2;
                const x = center + radius * normalizedScore * Math.cos(angle);
                const y = center + radius * normalizedScore * Math.sin(angle);
                points.push(`${x},${y}`);
            });

            svg += `<polygon points="${points.join(' ')}" 
                            class="radar-polygon" 
                            style="stroke: ${colors[optIdx]}; fill: ${colors[optIdx]}20;"/>`;
        });

        // Add dots at data points
        rankings.slice(0, 4).forEach((option, optIdx) => {
            criteria.forEach((c, i) => {
                const score = option.criteriaScores.find(cs => cs.criterionId === c.id)?.score || 5;
                const normalizedScore = score / 10;
                const angle = i * angleStep - Math.PI / 2;
                const x = center + radius * normalizedScore * Math.cos(angle);
                const y = center + radius * normalizedScore * Math.sin(angle);
                svg += `<circle cx="${x}" cy="${y}" r="4" fill="${colors[optIdx]}" class="radar-dot"/>`;
            });
        });

        svg += '</svg>';

        // Add legend
        let legend = '<div class="radar-legend">';
        rankings.slice(0, 4).forEach((option, idx) => {
            legend += `
                <div class="legend-item">
                    <span class="legend-color" style="background: ${colors[idx]}"></span>
                    <span class="legend-name">${this.escapeHtml(option.name)}</span>
                </div>
            `;
        });
        legend += '</div>';

        container.innerHTML = svg + legend;
    },

    /**
     * Render horizontal bar comparison
     */
    renderBarComparison(rankings, criteria) {
        const container = document.getElementById('visual-bars');
        if (!container) return;

        let html = '<div class="bar-comparison">';

        criteria.forEach(criterion => {
            html += `
                <div class="bar-criterion">
                    <div class="bar-criterion-name">${this.escapeHtml(criterion.name)}</div>
                    <div class="bar-group">
            `;

            rankings.forEach((option, idx) => {
                const score = option.criteriaScores.find(cs => cs.criterionId === criterion.id)?.score || 5;
                const width = score * 10;
                const isMax = rankings.every(r => {
                    const s = r.criteriaScores.find(cs => cs.criterionId === criterion.id)?.score || 0;
                    return s <= score;
                });

                html += `
                    <div class="bar-row">
                        <span class="bar-option-name">${this.truncate(option.name, 15)}</span>
                        <div class="bar-track">
                            <div class="bar-fill ${isMax ? 'best' : ''}" style="width: ${width}%"></div>
                        </div>
                        <span class="bar-score ${isMax ? 'best' : ''}">${score}</span>
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';
        container.innerHTML = html;
    },

    /**
     * Render score cards with strengths/weaknesses
     */
    renderScoreCards(rankings, criteria) {
        const container = document.getElementById('visual-cards');
        if (!container) return;

        let html = '<div class="score-cards">';

        rankings.forEach((option, idx) => {
            const strengths = option.criteriaScores
                .filter(cs => cs.score >= 7)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            const weaknesses = option.criteriaScores
                .filter(cs => cs.score <= 4)
                .sort((a, b) => a.score - b.score)
                .slice(0, 3);

            html += `
                <div class="score-card ${idx === 0 ? 'winner' : ''}">
                    <div class="score-card-header">
                        <span class="score-card-rank">${idx === 0 ? '🏆' : `#${idx + 1}`}</span>
                        <h4 class="score-card-name">${this.escapeHtml(option.name)}</h4>
                        <span class="score-card-total">${option.normalizedScore.toFixed(1)}/10</span>
                    </div>
                    <div class="score-card-body">
                        ${strengths.length > 0 ? `
                            <div class="score-card-section strengths">
                                <h5>✅ Strengths</h5>
                                <ul>
                                    ${strengths.map(s => `<li>${this.escapeHtml(s.criterionName)} <span>${s.score}/10</span></li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${weaknesses.length > 0 ? `
                            <div class="score-card-section weaknesses">
                                <h5>⚠️ Weaknesses</h5>
                                <ul>
                                    ${weaknesses.map(w => `<li>${this.escapeHtml(w.criterionName)} <span>${w.score}/10</span></li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${strengths.length === 0 && weaknesses.length === 0 ? '<p class="score-card-neutral">Average across all criteria</p>' : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    truncate(str, len) {
        return str.length > len ? str.substring(0, len - 1) + '…' : str;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
