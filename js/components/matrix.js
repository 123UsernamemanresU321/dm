/**
 * Matrix Component
 * Renders and manages the scoring matrix
 */

const Matrix = {
    /**
     * Render the scoring matrix
     */
    render(options, criteria) {
        const panel = document.getElementById('matrix-panel');
        const header = document.getElementById('matrix-header');
        const body = document.getElementById('matrix-body');

        if (!panel || !header || !body) return;

        // Show/hide panel based on data
        if (options.length === 0 || criteria.length === 0) {
            panel.classList.remove('visible');
            return;
        }

        panel.classList.add('visible');

        // Render header
        header.innerHTML = `
            <tr>
                <th>Criterion</th>
                ${options.map(opt => `<th>${this.escapeHtml(opt.name) || 'Option'}</th>`).join('')}
            </tr>
        `;

        // Render body
        body.innerHTML = criteria.map(criterion => `
            <tr>
                <td>${this.escapeHtml(criterion.name) || 'Criterion'}</td>
                ${options.map(opt => `
                    <td>
                        <input type="number" 
                               min="0" 
                               max="10" 
                               value="${opt.scores[criterion.id] ?? 5}"
                               data-option-id="${opt.id}"
                               data-criterion-id="${criterion.id}">
                    </td>
                `).join('')}
            </tr>
        `).join('');

        // Bind score input events
        body.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const optionId = e.target.dataset.optionId;
                const criterionId = e.target.dataset.criterionId;
                let value = parseInt(e.target.value) || 0;

                // Clamp value between 0 and 10
                value = Math.max(0, Math.min(10, value));
                e.target.value = value;

                // Update option score
                const option = DecisionForm.state.options.find(o => o.id === optionId);
                if (option) {
                    option.scores[criterionId] = value;
                }
            });

            // Select all on focus
            input.addEventListener('focus', (e) => {
                e.target.select();
            });
        });
    },

    /**
     * Render results matrix (read-only with highlighting)
     */
    renderResults(rankings, criteria) {
        const table = document.getElementById('results-matrix');
        if (!table) return;

        // Find best/worst scores per criterion
        const stats = {};
        criteria.forEach(criterion => {
            const scores = rankings.map(r => r.scores[criterion.id] || 0);
            stats[criterion.id] = {
                max: Math.max(...scores),
                min: Math.min(...scores)
            };
        });

        let html = `
            <thead>
                <tr>
                    <th>Criterion</th>
                    <th class="weight-col">Weight</th>
                    ${rankings.map(r => `<th>${this.escapeHtml(r.name)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
        `;

        criteria.forEach(criterion => {
            html += `<tr>
                <td>${this.escapeHtml(criterion.name)}</td>
                <td class="weight-col">${criterion.weight}/10</td>
                ${rankings.map(r => {
                const score = r.scores[criterion.id] || 0;
                let cellClass = '';
                if (score === stats[criterion.id].max && score >= 7) {
                    cellClass = 'cell-best';
                } else if (score === stats[criterion.id].min && score <= 4) {
                    cellClass = 'cell-worst';
                }
                return `<td class="${cellClass}">${score}</td>`;
            }).join('')}
            </tr>`;
        });

        // Total row
        html += `
            <tr class="total-row">
                <td colspan="2"><strong>Total Score</strong></td>
                ${rankings.map(r => `<td><strong>${r.normalizedScore.toFixed(1)}/10</strong></td>`).join('')}
            </tr>
        `;

        html += '</tbody>';
        table.innerHTML = html;
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
