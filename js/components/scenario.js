/**
 * Scenario Testing Component
 * Handles what-if analysis and weight adjustments
 */

const Scenario = {
    options: [],
    criteria: [],
    originalCriteria: [],

    init(options, criteria) {
        this.options = options;
        this.criteria = criteria.map(c => ({ ...c }));
        this.originalCriteria = criteria.map(c => ({ ...c }));
        this.renderSliders();
    },

    renderSliders() {
        const container = document.getElementById('scenario-sliders');
        if (!container) return;

        container.innerHTML = this.criteria.map(criterion => {
            const percent = ((criterion.weight - 1) / 9) * 100;
            return `
            <div class="scenario-slider-item" data-criterion-id="${criterion.id}">
                <label>${this.escapeHtml(criterion.name)}</label>
                <input type="range" min="1" max="10" value="${criterion.weight}" 
                       data-original="${criterion.weight}"
                       style="--slider-progress: ${percent}%">
                <span class="scenario-weight-value">${criterion.weight}/10</span>
            </div>
        `}).join('');

        container.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', (e) => this.onSliderChange(e));
        });

        this.updateScenarioResult();
    },

    updateSliderProgress(input) {
        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 10;
        const val = parseInt(input.value) || min;
        const percent = ((val - min) / (max - min)) * 100;
        input.style.setProperty('--slider-progress', `${percent}%`);
    },

    onSliderChange(e) {
        const slider = e.target;
        const item = slider.closest('.scenario-slider-item');
        const criterionId = item.dataset.criterionId;
        const newWeight = parseInt(slider.value);

        const criterion = this.criteria.find(c => c.id === criterionId);
        if (criterion) criterion.weight = newWeight;

        item.querySelector('.scenario-weight-value').textContent = `${newWeight}/10`;
        this.updateSliderProgress(slider);

        const original = parseInt(slider.dataset.original);
        item.style.background = newWeight !== original ? 'var(--color-warning-light)' : '';

        this.updateScenarioResult();
    },

    updateScenarioResult() {
        const container = document.getElementById('scenario-result');
        if (!container) return;

        const newResults = Scoring.generateRankings(this.options, this.criteria);
        const originalResults = Scoring.generateRankings(this.options, this.originalCriteria);

        if (newResults.rankings.length === 0) {
            container.innerHTML = '<p>No results to display.</p>';
            return;
        }

        const originalWinner = originalResults.rankings[0];
        const newWinner = newResults.rankings[0];
        const changed = originalWinner.id !== newWinner.id;

        if (changed) {
            container.className = 'scenario-result changed';
            container.innerHTML = `
                <p class="winner-change">⚠️ <strong>Winner changed!</strong></p>
                <p>With these weights, <strong>${this.escapeHtml(newWinner.name)}</strong> 
                (${newWinner.normalizedScore.toFixed(1)}/10) now wins.</p>
            `;
        } else {
            container.className = 'scenario-result';
            container.innerHTML = `
                <p><strong>${this.escapeHtml(newWinner.name)}</strong> leads with 
                ${newWinner.normalizedScore.toFixed(1)}/10. Adjust sliders to test scenarios.</p>
            `;
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
