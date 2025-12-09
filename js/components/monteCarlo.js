/**
 * Monte Carlo Uncertainty Simulation
 * Handles score ranges and probabilistic simulations
 */

const MonteCarlo = {
    simulations: 1000,

    /**
     * Run simulation with score ranges
     */
    runSimulation(options, criteria, scoreRanges = {}) {
        const wins = {};
        options.forEach(o => wins[o.id] = 0);

        for (let i = 0; i < this.simulations; i++) {
            // Generate random scores within ranges
            const simulatedOptions = options.map(option => {
                const scores = {};
                criteria.forEach(c => {
                    const range = scoreRanges[option.id]?.[c.id];
                    if (range && range.min !== undefined && range.max !== undefined) {
                        scores[c.id] = this.randomInRange(range.min, range.max);
                    } else {
                        scores[c.id] = option.scores[c.id] || 5;
                    }
                });
                return { ...option, scores };
            });

            // Calculate winner for this simulation
            const rankings = Scoring.generateRankings(simulatedOptions, criteria).rankings;
            if (rankings[0]) {
                wins[rankings[0].id]++;
            }
        }

        // Calculate percentages
        const results = options.map(o => ({
            id: o.id,
            name: o.name,
            wins: wins[o.id],
            percentage: (wins[o.id] / this.simulations * 100).toFixed(1)
        })).sort((a, b) => b.wins - a.wins);

        return {
            results,
            simulations: this.simulations,
            mostLikely: results[0]
        };
    },

    randomInRange(min, max) {
        return Math.round(min + Math.random() * (max - min));
    },

    /**
     * Render simulation results
     */
    render(simulationResults, containerId = 'montecarlo-results') {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `
            <div class="montecarlo-summary">
                <h4>🎲 Simulation Results (${simulationResults.simulations.toLocaleString()} runs)</h4>
                <p class="montecarlo-winner">
                    <strong>${this.escapeHtml(simulationResults.mostLikely.name)}</strong> 
                    wins ${simulationResults.mostLikely.percentage}% of scenarios
                </p>
            </div>
            <div class="montecarlo-bars">
        `;

        simulationResults.results.forEach((result, idx) => {
            const barClass = idx === 0 ? 'winner' : '';
            html += `
                <div class="montecarlo-row">
                    <span class="montecarlo-name">${this.escapeHtml(result.name)}</span>
                    <div class="montecarlo-bar-track">
                        <div class="montecarlo-bar ${barClass}" style="width: ${result.percentage}%"></div>
                    </div>
                    <span class="montecarlo-percent">${result.percentage}%</span>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
