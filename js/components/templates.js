/**
 * Decision Templates Library
 * Pre-built templates for common decision types
 */

const Templates = {
    templates: [
        {
            id: 'car-purchase',
            name: 'Which Car to Buy?',
            icon: '🚗',
            description: 'Compare vehicles based on price, reliability, features',
            category: 'Purchases',
            options: ['Tesla Model 3', 'Toyota Camry', 'Honda Accord', 'BMW 3 Series'],
            criteria: [
                { name: 'Price', weight: 8 },
                { name: 'Fuel Efficiency', weight: 7 },
                { name: 'Reliability', weight: 9 },
                { name: 'Features', weight: 6 },
                { name: 'Resale Value', weight: 5 }
            ]
        },
        {
            id: 'job-offer',
            name: 'Which Job Offer to Accept?',
            icon: '💼',
            description: 'Compare job opportunities by compensation, growth, culture',
            category: 'Career',
            options: ['Company A', 'Company B', 'Company C'],
            criteria: [
                { name: 'Salary & Benefits', weight: 9 },
                { name: 'Work-Life Balance', weight: 8 },
                { name: 'Career Growth', weight: 8 },
                { name: 'Company Culture', weight: 7 },
                { name: 'Location/Commute', weight: 6 }
            ]
        },
        {
            id: 'laptop',
            name: 'Which Laptop to Buy?',
            icon: '💻',
            description: 'Compare laptops by performance, portability, price',
            category: 'Purchases',
            options: ['MacBook Pro', 'Dell XPS', 'ThinkPad X1', 'ASUS ROG'],
            criteria: [
                { name: 'Price', weight: 8 },
                { name: 'Performance', weight: 8 },
                { name: 'Battery Life', weight: 7 },
                { name: 'Portability', weight: 6 },
                { name: 'Build Quality', weight: 7 }
            ]
        },
        {
            id: 'apartment',
            name: 'Which Apartment to Rent?',
            icon: '🏠',
            description: 'Compare apartments by location, price, amenities',
            category: 'Living',
            options: ['Apartment A', 'Apartment B', 'Apartment C'],
            criteria: [
                { name: 'Monthly Rent', weight: 9 },
                { name: 'Location', weight: 8 },
                { name: 'Size/Layout', weight: 7 },
                { name: 'Amenities', weight: 5 },
                { name: 'Safety/Neighborhood', weight: 8 }
            ]
        },
        {
            id: 'college',
            name: 'Which College to Attend?',
            icon: '🎓',
            description: 'Compare universities by academics, cost, campus life',
            category: 'Education',
            options: ['University A', 'University B', 'University C'],
            criteria: [
                { name: 'Academic Reputation', weight: 9 },
                { name: 'Tuition & Costs', weight: 8 },
                { name: 'Location', weight: 6 },
                { name: 'Campus Life', weight: 5 },
                { name: 'Career Outcomes', weight: 8 }
            ]
        },
        {
            id: 'vacation',
            name: 'Where to Vacation?',
            icon: '✈️',
            description: 'Compare destinations by cost, activities, weather',
            category: 'Travel',
            options: ['Beach Resort', 'European City', 'Adventure Trip', 'Staycation'],
            criteria: [
                { name: 'Total Cost', weight: 8 },
                { name: 'Activities', weight: 7 },
                { name: 'Weather', weight: 6 },
                { name: 'Travel Time', weight: 5 },
                { name: 'Relaxation Factor', weight: 7 }
            ]
        },
        {
            id: 'investment',
            name: 'Where to Invest?',
            icon: '📈',
            description: 'Compare investments by risk, return, liquidity',
            category: 'Finance',
            options: ['Stocks', 'Real Estate', 'Bonds', 'Crypto'],
            criteria: [
                { name: 'Expected Return', weight: 8 },
                { name: 'Risk Level', weight: 9 },
                { name: 'Liquidity', weight: 6 },
                { name: 'Time Horizon', weight: 5 },
                { name: 'Tax Efficiency', weight: 4 }
            ]
        },
        {
            id: 'phone',
            name: 'Which Phone to Buy?',
            icon: '📱',
            description: 'Compare smartphones by features, price, ecosystem',
            category: 'Purchases',
            options: ['iPhone 15 Pro', 'Samsung Galaxy S24', 'Google Pixel 8', 'OnePlus 12'],
            criteria: [
                { name: 'Price', weight: 8 },
                { name: 'Camera Quality', weight: 7 },
                { name: 'Battery Life', weight: 7 },
                { name: 'Performance', weight: 6 },
                { name: 'Ecosystem', weight: 5 }
            ]
        },
        {
            id: 'contractor',
            name: 'Which Contractor to Hire?',
            icon: '🔧',
            description: 'Compare contractors by cost, reviews, availability',
            category: 'Services',
            options: ['Contractor A', 'Contractor B', 'Contractor C'],
            criteria: [
                { name: 'Price Quote', weight: 8 },
                { name: 'Reviews/Reputation', weight: 9 },
                { name: 'Availability', weight: 6 },
                { name: 'Experience', weight: 7 },
                { name: 'Communication', weight: 5 }
            ]
        },
        {
            id: 'business-idea',
            name: 'Which Business Idea to Pursue?',
            icon: '💡',
            description: 'Compare ideas by market, investment, passion',
            category: 'Business',
            options: ['Idea A', 'Idea B', 'Idea C'],
            criteria: [
                { name: 'Market Potential', weight: 9 },
                { name: 'Initial Investment', weight: 7 },
                { name: 'Passion/Interest', weight: 8 },
                { name: 'Skill Match', weight: 6 },
                { name: 'Competition', weight: 7 }
            ]
        }
    ],

    /**
     * Get all templates
     */
    getAll() {
        return this.templates;
    },

    /**
     * Get template by ID
     */
    getById(id) {
        return this.templates.find(t => t.id === id);
    },

    /**
     * Get templates by category
     */
    getByCategory(category) {
        return this.templates.filter(t => t.category === category);
    },

    /**
     * Get all unique categories
     */
    getCategories() {
        return [...new Set(this.templates.map(t => t.category))];
    },

    /**
     * Apply template to decision form
     */
    apply(templateId) {
        const template = this.getById(templateId);
        if (!template) return false;

        // Reset form
        DecisionForm.reset();

        // Set title
        DecisionForm.state.title = template.name;
        document.getElementById('decision-title').value = template.name;

        // Add options
        template.options.forEach(optionName => {
            DecisionForm.addOption(optionName);
        });

        // Clear default criteria and add template criteria
        document.getElementById('criteria-list').innerHTML = '';
        DecisionForm.state.criteria = [];

        template.criteria.forEach(criterion => {
            DecisionForm.addCriterion(criterion.name, criterion.weight);
        });

        DecisionForm.updateMatrix();
        DecisionForm.updateCounts();
        DecisionForm.validateForm();

        return true;
    },

    /**
     * Render templates grid
     */
    renderGrid(containerId, onSelect) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const categories = this.getCategories();

        let html = '<div class="templates-filter">';
        html += '<button class="template-filter-btn active" data-category="all">All</button>';
        categories.forEach(cat => {
            html += `<button class="template-filter-btn" data-category="${cat}">${cat}</button>`;
        });
        html += '</div>';

        html += '<div class="templates-grid">';
        this.templates.forEach(template => {
            html += `
                <div class="template-card" data-template-id="${template.id}" data-category="${template.category}">
                    <div class="template-icon">${template.icon}</div>
                    <div class="template-info">
                        <h4 class="template-name">${template.name}</h4>
                        <p class="template-desc">${template.description}</p>
                        <div class="template-meta">
                            <span>${template.options.length} options</span>
                            <span>${template.criteria.length} criteria</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;

        // Bind filter events
        container.querySelectorAll('.template-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.template-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const category = e.target.dataset.category;
                container.querySelectorAll('.template-card').forEach(card => {
                    if (category === 'all' || card.dataset.category === category) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });

        // Bind card click events
        container.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                if (onSelect) onSelect(card.dataset.templateId);
            });
        });
    }
};
