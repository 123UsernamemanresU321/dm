/**
 * AI Module
 * Handles Deepseek API integration for intelligent suggestions and scoring
 * Uses Cloudflare Worker proxy for CORS and API key security
 */

const AI = {
    // Deepseek API configuration
    config: {
        // API key is stored securely in Cloudflare Worker - NOT in frontend code
        proxyUrl: 'https://deepseek-proxy.erichuang-shangjing.workers.dev',
        model: 'deepseek-chat'
    },

    /**
     * Check if proxy is configured
     */
    isConfigured() {
        return this.config.proxyUrl && this.config.proxyUrl.length > 0;
    },

    /**
     * Make API request through Cloudflare Worker proxy
     */
    async chat(messages, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('AI proxy not configured');
        }

        try {
            const response = await fetch(this.config.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: options.model || this.config.model,
                    messages: messages,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 1000
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (e) {
            if (e.message.includes('Load failed') || e.message.includes('Failed to fetch')) {
                throw new Error('Network error. Check your internet connection.');
            }
            throw e;
        }
    },

    /**
     * Suggest options based on decision title
     */
    async suggestOptions(decisionTitle, existingOptions = []) {
        const existingList = existingOptions.length > 0
            ? `\nExisting options to avoid duplicating: ${existingOptions.join(', ')}`
            : '';

        const prompt = `Given the decision: "${decisionTitle}"${existingList}

Suggest 3-5 relevant options to consider. Return ONLY a JSON array of option names, nothing else.
Example format: ["Option 1", "Option 2", "Option 3"]`;

        try {
            const response = await this.chat([
                { role: 'system', content: 'You are a helpful decision-making assistant. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.8 });

            // Parse JSON from response
            const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('Error suggesting options:', e);
            throw new Error('Failed to get AI suggestions: ' + e.message);
        }
    },

    /**
     * Auto-score options based on criteria
     */
    async autoScore(decisionTitle, options, criteria) {
        const optionNames = options.map(o => o.name);
        const criteriaNames = criteria.map(c => c.name);

        const prompt = `Decision: "${decisionTitle}"

Options to evaluate:
${optionNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Criteria to score on (0-10 scale where 10=BEST, 0=WORST for the decision-maker):
${criteriaNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

IMPORTANT SCORING RULES:
- Scores represent DESIRABILITY (10 = most desirable outcome, 0 = least desirable)
- For COST/PRICE criteria: LOWER cost = HIGHER score (e.g., cheapest option gets 10, most expensive gets lower scores)
- For BENEFIT criteria (quality, features, long-term value): MORE benefit = HIGHER score
- For TIME criteria (delivery, duration): Usually FASTER/SHORTER = HIGHER score unless otherwise implied
- For RISK criteria: LOWER risk = HIGHER score

For each option, provide a score (0-10) for each criterion based on these rules.

Return ONLY a JSON object in this exact format:
{
  "scores": {
    "Option Name": {
      "Criterion Name": 7,
      "Another Criterion": 8
    }
  },
  "reasoning": {
    "Option Name": "Brief explanation"
  }
}`;

        try {
            const response = await this.chat([
                { role: 'system', content: 'You are an expert decision analyst. Provide objective, well-reasoned scores. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.5, maxTokens: 2000 });

            // Parse JSON from response
            const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
            const result = JSON.parse(cleaned);

            // Map scores back to option/criteria IDs
            const scoredOptions = options.map(option => {
                const optionScores = result.scores[option.name] || {};
                const scores = {};

                criteria.forEach(criterion => {
                    const score = optionScores[criterion.name];
                    if (typeof score === 'number') {
                        scores[criterion.id] = Math.min(10, Math.max(0, Math.round(score)));
                    } else {
                        scores[criterion.id] = 5; // Default if not found
                    }
                });

                return {
                    ...option,
                    scores,
                    aiReasoning: result.reasoning?.[option.name] || ''
                };
            });

            return {
                options: scoredOptions,
                reasoning: result.reasoning || {}
            };
        } catch (e) {
            console.error('Error auto-scoring:', e);
            throw new Error('Failed to get AI scores: ' + e.message);
        }
    },

    /**
     * Generate pros/cons for each option based on scores (no API call needed)
     * Returns structured summary based on score data
     */
    generateProsCons(rankings, criteria) {
        return rankings.map(option => {
            const pros = [];
            const cons = [];

            option.criteriaScores.forEach(cs => {
                const criterion = criteria.find(c => c.id === cs.criterionId);
                if (!criterion) return;

                if (cs.score >= 8) {
                    pros.push(`Strong in ${criterion.name} (${cs.score}/10)`);
                } else if (cs.score >= 7) {
                    pros.push(`Good ${criterion.name}`);
                } else if (cs.score <= 3) {
                    cons.push(`Weak in ${criterion.name} (${cs.score}/10)`);
                } else if (cs.score <= 4) {
                    cons.push(`Below average ${criterion.name}`);
                }
            });

            // Add comparative insights
            const isWinner = rankings[0].id === option.id;
            const highestCrit = option.criteriaScores.reduce((a, b) => a.score > b.score ? a : b);
            const lowestCrit = option.criteriaScores.reduce((a, b) => a.score < b.score ? a : b);

            if (isWinner && pros.length === 0) {
                pros.push('Best overall balance');
            }

            return {
                optionId: option.id,
                optionName: option.name,
                pros: pros.slice(0, 4),
                cons: cons.slice(0, 4),
                bestIn: criteria.find(c => c.id === highestCrit.criterionId)?.name,
                worstIn: criteria.find(c => c.id === lowestCrit.criterionId)?.name
            };
        });
    },

    /**
     * Get AI-generated detailed pros/cons analysis
     */
    async getDetailedProsCons(decisionTitle, rankings, criteria) {
        const optionsData = rankings.map(r => ({
            name: r.name,
            score: r.normalizedScore.toFixed(1),
            scores: r.criteriaScores.map(cs => `${cs.criterionName}: ${cs.score}/10`).join(', ')
        }));

        const prompt = `Decision: "${decisionTitle}"

Options with their scores:
${optionsData.map((o, i) => `${i + 1}. ${o.name} (Overall: ${o.score}/10)
   Scores: ${o.scores}`).join('\n')}

For each option, provide a concise 2-3 bullet point summary of:
- Key advantages (✅)
- Key disadvantages (❌)

Return ONLY a JSON array in this format:
[
  {
    "option": "Option Name",
    "pros": ["advantage 1", "advantage 2"],
    "cons": ["disadvantage 1", "disadvantage 2"]
  }
]`;

        try {
            const response = await this.chat([
                { role: 'system', content: 'You are a decision analysis expert. Provide concise, actionable insights. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.5, maxTokens: 1500 });

            const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('Error getting detailed pros/cons:', e);
            // Fall back to score-based generation
            return this.generateProsCons(rankings, criteria);
        }
    },

    /**
     * Analyze constraint notes using AI
     * Returns compliance scores (0-10) for each option based on how well they meet the notes requirements
     */
    async analyzeConstraintNotes(constraintNotes, options) {
        if (!constraintNotes || constraintNotes.trim() === '' || options.length === 0) {
            return null;
        }

        const optionNames = options.map(o => o.name);

        const prompt = `Analyze these decision constraints/requirements:
"${constraintNotes}"

For each option below, rate how well it would meet these constraints on a 0-10 scale:
- 10 = Fully complies with all constraints
- 5 = Partially complies or unclear
- 0 = Clearly violates the constraints

Options to evaluate:
${optionNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Return ONLY a JSON object in this format:
{
  "scores": {
    "Option Name": 8,
    "Another Option": 5
  },
  "reasoning": {
    "Option Name": "Brief explanation of compliance"
  }
}`;

        try {
            const response = await this.chat([
                { role: 'system', content: 'You are a constraint compliance analyst. Evaluate how well each option meets the stated requirements. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.3, maxTokens: 800 });

            const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
            const result = JSON.parse(cleaned);

            // Map to option IDs
            return options.map(option => ({
                id: option.id,
                name: option.name,
                constraintCompliance: result.scores?.[option.name] ?? 5,
                constraintReasoning: result.reasoning?.[option.name] ?? ''
            }));
        } catch (e) {
            console.error('Error analyzing constraint notes:', e);
            return null;
        }
    },

    /**
     * Auto-score with constraint context included in prompt
     */
    async autoScoreWithConstraints(decisionTitle, options, criteria, constraints) {
        const optionNames = options.map(o => o.name);
        const criteriaNames = criteria.map(c => c.name);

        let constraintContext = '';
        if (constraints) {
            if (constraints.budget) constraintContext += `\nBudget limit: ${constraints.budget}`;
            if (constraints.deadline) constraintContext += `\nDeadline: ${constraints.deadline}`;
            if (constraints.notes) constraintContext += `\nAdditional requirements: ${constraints.notes}`;
        }

        const prompt = `Decision: "${decisionTitle}"
${constraintContext ? '\nCONSTRAINTS:' + constraintContext + '\n' : ''}
Options to evaluate:
${optionNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Criteria to score on (0-10 scale where 10=BEST, 0=WORST for the decision-maker):
${criteriaNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

IMPORTANT SCORING RULES:
- Scores represent DESIRABILITY (10 = most desirable outcome, 0 = least desirable)
- For COST/PRICE criteria: LOWER cost = HIGHER score
- For BENEFIT criteria: MORE benefit = HIGHER score  
- For TIME criteria: Usually FASTER/SHORTER = HIGHER score
- For RISK criteria: LOWER risk = HIGHER score
- CONSIDER THE CONSTRAINTS when scoring - options that violate constraints should score lower on relevant criteria

Return ONLY a JSON object in this exact format:
{
  "scores": {
    "Option Name": {
      "Criterion Name": 7
    }
  },
  "reasoning": {
    "Option Name": "Brief explanation"
  },
  "constraintCompliance": {
    "Option Name": 8
  }
}`;

        try {
            const response = await this.chat([
                { role: 'system', content: 'You are an expert decision analyst. Consider all constraints when scoring. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.5, maxTokens: 2500 });

            const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
            const result = JSON.parse(cleaned);

            // Map scores back to option/criteria IDs
            const scoredOptions = options.map(option => {
                const optionScores = result.scores[option.name] || {};
                const scores = {};

                criteria.forEach(criterion => {
                    const score = optionScores[criterion.name];
                    if (typeof score === 'number') {
                        scores[criterion.id] = Math.min(10, Math.max(0, Math.round(score)));
                    } else {
                        scores[criterion.id] = 5;
                    }
                });

                return {
                    ...option,
                    scores,
                    constraintCompliance: result.constraintCompliance?.[option.name] ?? undefined,
                    aiReasoning: result.reasoning?.[option.name] || ''
                };
            });

            return {
                options: scoredOptions,
                reasoning: result.reasoning || {}
            };
        } catch (e) {
            console.error('Error auto-scoring with constraints:', e);
            throw new Error('Failed to get AI scores: ' + e.message);
        }
    }
};

