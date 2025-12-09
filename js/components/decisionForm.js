/**
 * Decision Form Component
 * Handles the input form for creating/editing decisions
 */

const DecisionForm = {
    state: {
        options: [],
        criteria: [],
        title: ''
    },

    defaultCriteria: [
        { id: 'cost', name: 'Cost', weight: 7, description: 'Total price or expense' },
        { id: 'time', name: 'Time Required', weight: 6, description: 'How long it takes' },
        { id: 'convenience', name: 'Convenience', weight: 5, description: 'Ease of implementation' },
        { id: 'risk', name: 'Risk Level', weight: 6, description: 'Potential downsides' },
        { id: 'longterm', name: 'Long-Term Benefit', weight: 8, description: 'Future value' },
        { id: 'satisfaction', name: 'Emotional Satisfaction', weight: 5, description: 'How good it feels' },
        { id: 'reversibility', name: 'Reversibility', weight: 4, description: 'Can you undo it?' },
        { id: 'urgency', name: 'Urgency', weight: 5, description: 'How time-sensitive' },
        { id: 'alignment', name: 'Goal Alignment', weight: 7, description: 'Matches your objectives' }
    ],

    /**
     * Initialize the form
     */
    init() {
        this.bindEvents();
        this.addDefaultCriteria();
        this.updateCounts();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Title input
        const titleInput = document.getElementById('decision-title');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                this.state.title = e.target.value;
                this.validateForm();
            });
        }

        // Add option button
        const addOptionBtn = document.getElementById('add-option-btn');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => this.addOption());
        }

        // Add criterion button
        const addCriterionBtn = document.getElementById('add-criterion-btn');
        if (addCriterionBtn) {
            addCriterionBtn.addEventListener('click', () => this.addCriterion());
        }

        // Calculate button
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculate());
        }
    },

    /**
     * Add default criteria
     */
    addDefaultCriteria() {
        // Add only first 5 defaults to keep it simple
        this.defaultCriteria.slice(0, 5).forEach(criterion => {
            this.addCriterion(criterion.name, criterion.weight, criterion.id);
        });
    },

    /**
     * Add a new option
     */
    addOption(name = '', id = null) {
        const optionId = id || Storage.generateId();
        const option = {
            id: optionId,
            name: name,
            scores: {}
        };

        this.state.options.push(option);
        this.renderOption(option);
        this.updateMatrix();
        this.updateCounts();
        this.validateForm();

        // Focus on the new input if empty
        if (!name) {
            setTimeout(() => {
                const input = document.querySelector(`[data-option-id="${optionId}"] input`);
                if (input) input.focus();
            }, 50);
        }
    },

    /**
     * Render an option item
     */
    renderOption(option) {
        const list = document.getElementById('options-list');
        if (!list) return;

        const item = UI.createElement('div', {
            className: 'option-item',
            dataset: { optionId: option.id }
        }, [
            UI.createElement('input', {
                type: 'text',
                value: option.name,
                placeholder: 'Option name...',
                onInput: (e) => {
                    option.name = e.target.value;
                    this.updateMatrix();
                    this.validateForm();
                }
            }),
            UI.createElement('button', {
                className: 'btn btn-icon btn-remove btn-danger',
                title: 'Remove option',
                innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
                onClick: () => this.removeOption(option.id)
            })
        ]);

        list.appendChild(item);
    },

    /**
     * Remove an option
     */
    removeOption(id) {
        this.state.options = this.state.options.filter(o => o.id !== id);
        const element = document.querySelector(`[data-option-id="${id}"]`);
        if (element) element.remove();
        this.updateMatrix();
        this.updateCounts();
        this.validateForm();
    },

    /**
     * Add a new criterion
     */
    addCriterion(name = '', weight = 5, id = null) {
        const criterionId = id || Storage.generateId();
        const criterion = {
            id: criterionId,
            name: name,
            weight: weight
        };

        this.state.criteria.push(criterion);
        this.renderCriterion(criterion);
        this.updateMatrix();
        this.updateCounts();
        this.validateForm();

        // Focus on the new input if empty
        if (!name) {
            setTimeout(() => {
                const input = document.querySelector(`[data-criterion-id="${criterionId}"] input[type="text"]`);
                if (input) input.focus();
            }, 50);
        }
    },

    /**
     * Render a criterion item
     */
    renderCriterion(criterion) {
        const list = document.getElementById('criteria-list');
        if (!list) return;

        const weightDisplay = UI.createElement('span', {
            className: 'criterion-weight',
            textContent: `${criterion.weight}/10`
        });

        const slider = UI.createElement('input', {
            type: 'range',
            min: '1',
            max: '10',
            value: criterion.weight.toString()
        });

        // Update slider progress
        const updateSliderProgress = (input) => {
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 10;
            const val = parseInt(input.value) || min;
            const percent = ((val - min) / (max - min)) * 100;
            input.style.setProperty('--slider-progress', `${percent}%`);
        };

        slider.addEventListener('input', (e) => {
            criterion.weight = parseInt(e.target.value);
            weightDisplay.textContent = `${criterion.weight}/10`;
            updateSliderProgress(e.target);
        });

        // Set initial progress
        updateSliderProgress(slider);

        const item = UI.createElement('div', {
            className: 'criterion-item',
            dataset: { criterionId: criterion.id }
        }, [
            UI.createElement('input', {
                type: 'text',
                value: criterion.name,
                placeholder: 'Criterion name...',
                onInput: (e) => {
                    criterion.name = e.target.value;
                    this.updateMatrix();
                    this.validateForm();
                }
            }),
            UI.createElement('div', {
                className: 'criterion-slider'
            }, [slider]),
            weightDisplay,
            UI.createElement('button', {
                className: 'btn btn-icon btn-remove btn-danger',
                title: 'Remove criterion',
                innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
                onClick: () => this.removeCriterion(criterion.id)
            })
        ]);

        list.appendChild(item);
    },

    /**
     * Remove a criterion
     */
    removeCriterion(id) {
        this.state.criteria = this.state.criteria.filter(c => c.id !== id);

        // Remove scores for this criterion from all options
        this.state.options.forEach(option => {
            delete option.scores[id];
        });

        const element = document.querySelector(`[data-criterion-id="${id}"]`);
        if (element) element.remove();

        this.updateMatrix();
        this.updateCounts();
        this.validateForm();
    },

    /**
     * Update the scoring matrix
     */
    updateMatrix() {
        Matrix.render(this.state.options, this.state.criteria);
    },

    /**
     * Update option and criteria counts
     */
    updateCounts() {
        const optionsCount = document.getElementById('options-count');
        const criteriaCount = document.getElementById('criteria-count');

        if (optionsCount) optionsCount.textContent = this.state.options.length;
        if (criteriaCount) criteriaCount.textContent = this.state.criteria.length;
    },

    /**
     * Validate the form
     */
    validateForm() {
        const isValid = this.state.title.trim() !== '' &&
            this.state.options.length >= 2 &&
            this.state.options.every(o => o.name.trim() !== '') &&
            this.state.criteria.length >= 1 &&
            this.state.criteria.every(c => c.name.trim() !== '');

        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.disabled = !isValid;
        }

        return isValid;
    },

    /**
     * Calculate and show results
     */
    calculate() {
        if (!this.validateForm()) {
            UI.toast('Please fill in all fields', 'warning');
            return;
        }

        // Ensure all options have scores for all criteria
        this.state.options.forEach(option => {
            this.state.criteria.forEach(criterion => {
                if (option.scores[criterion.id] === undefined) {
                    option.scores[criterion.id] = 5; // Default to middle score
                }
            });
        });

        const results = Scoring.generateRankings(this.state.options, this.state.criteria);

        Results.render(results, this.state.options, this.state.criteria, {
            title: this.state.title,
            constraints: this.getConstraints()
        });

        Scenario.init(this.state.options, this.state.criteria);

        UI.hide('#input-section');
        UI.show('#results-section');
        UI.scrollTo('#results-section');
    },

    /**
     * Get constraints from form
     */
    getConstraints() {
        return {
            budget: document.getElementById('constraint-budget')?.value || '',
            deadline: document.getElementById('constraint-deadline')?.value || '',
            notes: document.getElementById('constraint-notes')?.value || ''
        };
    },

    /**
     * Load a decision
     */
    loadDecision(decision) {
        // Clear current state
        this.reset();

        // Set title
        this.state.title = decision.title;
        document.getElementById('decision-title').value = decision.title;

        // Load options
        decision.options.forEach(option => {
            this.state.options.push({ ...option });
            this.renderOption(option);
        });

        // Clear default criteria and load saved ones
        document.getElementById('criteria-list').innerHTML = '';
        this.state.criteria = [];

        decision.criteria.forEach(criterion => {
            this.state.criteria.push({ ...criterion });
            this.renderCriterion(criterion);
        });

        // Load constraints
        if (decision.constraints) {
            if (decision.constraints.budget) {
                document.getElementById('constraint-budget').value = decision.constraints.budget;
            }
            if (decision.constraints.deadline) {
                document.getElementById('constraint-deadline').value = decision.constraints.deadline;
            }
            if (decision.constraints.notes) {
                document.getElementById('constraint-notes').value = decision.constraints.notes;
            }
        }

        this.updateMatrix();
        this.updateCounts();
        this.validateForm();
    },

    /**
     * Reset the form
     */
    reset() {
        this.state = {
            options: [],
            criteria: [],
            title: ''
        };

        document.getElementById('decision-title').value = '';
        document.getElementById('options-list').innerHTML = '';
        document.getElementById('criteria-list').innerHTML = '';
        document.getElementById('constraint-budget').value = '';
        document.getElementById('constraint-deadline').value = '';
        document.getElementById('constraint-notes').value = '';

        this.updateCounts();
        this.validateForm();
    },

    /**
     * Get current decision data
     */
    getDecisionData() {
        return {
            title: this.state.title,
            options: this.state.options.map(o => ({ ...o })),
            criteria: this.state.criteria.map(c => ({ ...c })),
            constraints: this.getConstraints()
        };
    }
};
