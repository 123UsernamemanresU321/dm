/**
 * Scoring Module
 * Handles weighted scoring algorithm and ranking generation
 */

const Scoring = {
    /**
     * Normalize a score to 0-10 scale
     */
    normalizeScore(value, min = 0, max = 10) {
        if (max === min) return 5;
        return ((value - min) / (max - min)) * 10;
    },

    /**
     * Calculate total weighted score for an option
     */
    calculateScore(option, criteria) {
        let totalScore = 0;
        let maxPossible = 0;

        criteria.forEach(criterion => {
            const score = option.scores[criterion.id] || 0;
            const normalizedScore = this.normalizeScore(score, 0, 10);
            totalScore += criterion.weight * normalizedScore;
            maxPossible += criterion.weight * 10;
        });

        return {
            raw: totalScore,
            max: maxPossible,
            normalized: maxPossible > 0 ? (totalScore / maxPossible) * 10 : 0
        };
    },

    /**
     * Calculate constraint penalty for an option (0 to 1, where 1 = no penalty)
     * Uses soft constraints - options over budget get penalized, not eliminated
     */
    calculateConstraintPenalty(option, constraints) {
        if (!constraints) return { factor: 1.0, violations: [] };

        let penaltyFactor = 1.0;
        const violations = [];

        // Budget constraint penalty
        if (constraints.budget && option.estimatedCost) {
            const budgetLimit = parseFloat(constraints.budget.replace(/[^0-9.]/g, ''));
            const optionCost = parseFloat(option.estimatedCost);

            if (!isNaN(budgetLimit) && !isNaN(optionCost) && budgetLimit > 0) {
                const ratio = optionCost / budgetLimit;

                if (ratio > 1.5) {
                    // Severely over budget: 50% penalty
                    penaltyFactor *= 0.5;
                    violations.push({ type: 'budget', severity: 'severe', message: `${Math.round((ratio - 1) * 100)}% over budget` });
                } else if (ratio > 1.0) {
                    // Over budget: proportional penalty (up to 30%)
                    penaltyFactor *= Math.max(0.7, 1 - (ratio - 1) * 0.6);
                    violations.push({ type: 'budget', severity: 'moderate', message: `${Math.round((ratio - 1) * 100)}% over budget` });
                } else if (ratio > 0.9) {
                    // Approaching budget: small 5% penalty
                    penaltyFactor *= 0.95;
                    violations.push({ type: 'budget', severity: 'minor', message: 'Close to budget limit' });
                }
                // Under 90% of budget: no penalty (reward for being economical could be added)
            }
        }

        // AI-analyzed constraint score (from notes analysis)
        if (option.constraintCompliance !== undefined) {
            // constraintCompliance is 0-10
            const complianceFactor = 0.7 + (option.constraintCompliance / 10) * 0.3;
            penaltyFactor *= complianceFactor;

            if (option.constraintCompliance < 5) {
                violations.push({
                    type: 'notes',
                    severity: option.constraintCompliance < 3 ? 'severe' : 'moderate',
                    message: 'Low constraint compliance from notes'
                });
            }
        }

        return { factor: penaltyFactor, violations };
    },

    /**
     * Generate rankings for all options
     */
    generateRankings(options, criteria, constraints = null) {
        if (!options.length || !criteria.length) {
            return { rankings: [], confidence: 0, analysis: null };
        }

        // Calculate scores for each option
        const scored = options.map(option => {
            const scoreData = this.calculateScore(option, criteria);
            const constraintData = this.calculateConstraintPenalty(option, constraints);

            // Apply constraint penalty to normalized score
            const adjustedScore = scoreData.normalized * constraintData.factor;

            return {
                ...option,
                totalScore: scoreData.raw * constraintData.factor,
                rawScore: scoreData.raw,
                maxPossible: scoreData.max,
                normalizedScore: adjustedScore,
                rawNormalizedScore: scoreData.normalized,
                constraintPenalty: constraintData.factor,
                constraintViolations: constraintData.violations,
                criteriaScores: this.getCriteriaBreakdown(option, criteria)
            };
        });

        // Sort by adjusted total score (descending)
        scored.sort((a, b) => b.totalScore - a.totalScore);

        // Add rank
        scored.forEach((item, index) => {
            item.rank = index + 1;
        });

        // Calculate confidence
        const confidence = this.calculateConfidence(scored);

        // Generate analysis
        const analysis = this.generateAnalysis(scored, criteria, constraints);

        return { rankings: scored, confidence, analysis };
    },

    /**
     * Get breakdown of scores per criterion
     */
    getCriteriaBreakdown(option, criteria) {
        return criteria.map(criterion => ({
            criterionId: criterion.id,
            criterionName: criterion.name,
            weight: criterion.weight,
            score: option.scores[criterion.id] || 0,
            weightedScore: (option.scores[criterion.id] || 0) * criterion.weight
        }));
    },

    /**
     * Calculate confidence level based on score margins
     */
    calculateConfidence(rankings) {
        if (rankings.length < 2) return { level: 'high', value: 1.0, label: 'HIGH' };

        const topScore = rankings[0].totalScore;
        const secondScore = rankings[1].totalScore;
        const maxScore = rankings[0].maxPossible;

        if (maxScore === 0) return { level: 'low', value: 0.5, label: 'LOW' };

        const margin = (topScore - secondScore) / maxScore;

        if (margin < 0.03) {
            return { level: 'low', value: 0.4, label: 'LOW', message: 'Options are extremely close. Consider additional criteria.' };
        }
        if (margin < 0.08) {
            return { level: 'medium', value: 0.6, label: 'MEDIUM', message: 'Close competition. Small changes could shift the ranking.' };
        }
        if (margin < 0.15) {
            return { level: 'medium', value: 0.75, label: 'MEDIUM', message: 'Clear leader, but second option is competitive.' };
        }
        return { level: 'high', value: 0.9, label: 'HIGH', message: 'Strong confidence in the recommendation.' };
    },

    /**
     * Generate analysis/rationale
     */
    generateAnalysis(rankings, criteria, constraints = null) {
        if (rankings.length < 1) return null;

        const winner = rankings[0];
        const runnerUp = rankings[1];

        // Find winner's strengths (criteria where it scores highest relative to weight)
        const strengths = this.findStrengths(winner, rankings, criteria);

        // Find winner's weaknesses
        const weaknesses = this.findWeaknesses(winner, rankings, criteria);

        // Generate rationale text
        let rationale = `<strong>${winner.name}</strong> scores highest with ${winner.normalizedScore.toFixed(1)}/10`;

        // Add constraint penalty info if applicable
        if (winner.constraintPenalty && winner.constraintPenalty < 1) {
            rationale += ` (includes ${Math.round((1 - winner.constraintPenalty) * 100)}% constraint penalty)`;
        }
        rationale += '. ';

        if (strengths.length > 0) {
            rationale += `Key strengths include <strong>${strengths.map(s => s.name).join('</strong> and <strong>')}</strong>. `;
        }

        if (runnerUp) {
            const scoreDiff = winner.normalizedScore - runnerUp.normalizedScore;
            if (scoreDiff < 0.5) {
                rationale += `<strong>${runnerUp.name}</strong> is very close behind (${runnerUp.normalizedScore.toFixed(1)}/10) and could be considered a safe fallback. `;
            } else {
                rationale += `${runnerUp.name} follows at ${runnerUp.normalizedScore.toFixed(1)}/10. `;
            }
        }

        if (weaknesses.length > 0) {
            rationale += `Note: The winner scores lower on <strong>${weaknesses.map(w => w.name).join('</strong> and <strong>')}</strong> — consider if these matter more than weighted.`;
        }

        // Add constraint violation warnings
        const constraintWarnings = [];
        rankings.forEach(r => {
            if (r.constraintViolations && r.constraintViolations.length > 0) {
                r.constraintViolations.forEach(v => {
                    if (v.severity === 'severe' || v.severity === 'moderate') {
                        constraintWarnings.push(`${r.name}: ${v.message}`);
                    }
                });
            }
        });

        return {
            winner: winner.name,
            runnerUp: runnerUp ? runnerUp.name : null,
            strengths,
            weaknesses,
            rationale,
            constraintWarnings,
            tradeoffs: this.generateTradeoffs(rankings, criteria)
        };
    },

    /**
     * Find criteria where the winner excels
     */
    findStrengths(winner, rankings, criteria) {
        const strengths = [];

        criteria.forEach(criterion => {
            const winnerScore = winner.scores[criterion.id] || 0;
            const avgScore = rankings.reduce((sum, r) => sum + (r.scores[criterion.id] || 0), 0) / rankings.length;

            if (winnerScore > avgScore && winnerScore >= 7) {
                strengths.push({
                    id: criterion.id,
                    name: criterion.name,
                    score: winnerScore,
                    advantage: winnerScore - avgScore
                });
            }
        });

        // Sort by weighted importance
        strengths.sort((a, b) => {
            const weightA = criteria.find(c => c.id === a.id)?.weight || 0;
            const weightB = criteria.find(c => c.id === b.id)?.weight || 0;
            return (b.advantage * weightB) - (a.advantage * weightA);
        });

        return strengths.slice(0, 3);
    },

    /**
     * Find criteria where the winner is weak
     */
    findWeaknesses(winner, rankings, criteria) {
        const weaknesses = [];

        criteria.forEach(criterion => {
            const winnerScore = winner.scores[criterion.id] || 0;
            const maxScore = Math.max(...rankings.map(r => r.scores[criterion.id] || 0));

            if (winnerScore < maxScore && winnerScore <= 5) {
                weaknesses.push({
                    id: criterion.id,
                    name: criterion.name,
                    score: winnerScore,
                    deficit: maxScore - winnerScore
                });
            }
        });

        weaknesses.sort((a, b) => b.deficit - a.deficit);
        return weaknesses.slice(0, 2);
    },

    /**
     * Generate trade-off analysis for each option
     */
    generateTradeoffs(rankings, criteria) {
        return rankings.map(option => {
            const pros = [];
            const cons = [];

            criteria.forEach(criterion => {
                const score = option.scores[criterion.id] || 0;
                if (score >= 8) {
                    pros.push(criterion.name);
                } else if (score <= 4) {
                    cons.push(criterion.name);
                }
            });

            return {
                optionId: option.id,
                optionName: option.name,
                pros,
                cons
            };
        });
    },

    /**
     * Perform what-if analysis with modified weights
     */
    whatIfAnalysis(options, criteria, modifiedCriterionId, newWeight) {
        const modifiedCriteria = criteria.map(c =>
            c.id === modifiedCriterionId ? { ...c, weight: newWeight } : c
        );

        const newResults = this.generateRankings(options, modifiedCriteria);
        const originalResults = this.generateRankings(options, criteria);

        const changed = originalResults.rankings.length > 0 &&
            newResults.rankings.length > 0 &&
            originalResults.rankings[0].id !== newResults.rankings[0].id;

        return {
            originalWinner: originalResults.rankings[0]?.name,
            newWinner: newResults.rankings[0]?.name,
            changed,
            newRankings: newResults.rankings
        };
    },

    /**
     * Find threshold where winner changes
     */
    findTippingPoint(options, criteria, criterionId) {
        const originalResults = this.generateRankings(options, criteria);
        if (originalResults.rankings.length < 2) return null;

        const originalWinner = originalResults.rankings[0].id;
        const criterion = criteria.find(c => c.id === criterionId);
        if (!criterion) return null;

        // Test weights from 1 to 10
        for (let weight = 1; weight <= 10; weight++) {
            const result = this.whatIfAnalysis(options, criteria, criterionId, weight);
            if (result.changed) {
                return {
                    criterionName: criterion.name,
                    tippingWeight: weight,
                    newWinner: result.newWinner
                };
            }
        }

        return null;
    }
};
