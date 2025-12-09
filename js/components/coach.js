/**
 * AI Decision Coach
 * Provides a conversational interface to ask questions about your decision
 */

const Coach = {
    isOpen: false,
    messages: [],
    context: null,

    /**
     * Initialize the coach
     */
    init() {
        this.createChatUI();
        this.bindEvents();
    },

    /**
     * Create the chat UI elements
     */
    createChatUI() {
        // Create chat button
        const chatBtn = document.createElement('button');
        chatBtn.id = 'coach-btn';
        chatBtn.className = 'coach-fab';
        chatBtn.innerHTML = `
            <span class="coach-icon">🤖</span>
            <span class="coach-label">AI Coach</span>
        `;
        chatBtn.title = 'Ask AI Coach about your decision';

        // Create chat panel
        const chatPanel = document.createElement('div');
        chatPanel.id = 'coach-panel';
        chatPanel.className = 'coach-panel';
        chatPanel.innerHTML = `
            <div class="coach-header">
                <h4>🤖 AI Decision Coach</h4>
                <button class="coach-close" title="Close">&times;</button>
            </div>
            <div class="coach-messages" id="coach-messages">
                <div class="coach-message assistant">
                    <p>Hi! I'm your AI Decision Coach. Ask me anything about your decision:</p>
                    <ul class="coach-suggestions">
                        <li data-q="Why is the winner the best choice?">Why is the winner the best choice?</li>
                        <li data-q="What are the trade-offs?">What are the trade-offs?</li>
                        <li data-q="How confident should I be?">How confident should I be?</li>
                        <li data-q="What am I not considering?">What am I not considering?</li>
                    </ul>
                </div>
            </div>
            <div class="coach-input-area">
                <input type="text" id="coach-input" placeholder="Ask a question..." autocomplete="off">
                <button id="coach-send" class="coach-send-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22,2 15,22 11,13 2,9"/>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(chatBtn);
        document.body.appendChild(chatPanel);
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        document.getElementById('coach-btn')?.addEventListener('click', () => this.toggle());
        document.getElementById('coach-panel')?.querySelector('.coach-close')?.addEventListener('click', () => this.close());

        document.getElementById('coach-send')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('coach-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Quick question suggestions
        document.querySelectorAll('.coach-suggestions li').forEach(li => {
            li.addEventListener('click', () => {
                document.getElementById('coach-input').value = li.dataset.q;
                this.sendMessage();
            });
        });
    },

    /**
     * Toggle chat panel
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    },

    open() {
        this.isOpen = true;
        document.getElementById('coach-panel')?.classList.add('open');
        document.getElementById('coach-btn')?.classList.add('active');
        document.getElementById('coach-input')?.focus();

        // Update context with current decision data
        this.updateContext();
    },

    close() {
        this.isOpen = false;
        document.getElementById('coach-panel')?.classList.remove('open');
        document.getElementById('coach-btn')?.classList.remove('active');
    },

    /**
     * Update context with current decision data
     */
    updateContext() {
        if (Results.currentDecision) {
            const decision = Results.currentDecision;
            this.context = {
                title: decision.title,
                options: decision.options?.map(o => o.name) || [],
                criteria: decision.criteria?.map(c => ({ name: c.name, weight: c.weight })) || [],
                winner: decision.results?.rankings?.[0]?.name,
                runnerUp: decision.results?.rankings?.[1]?.name,
                rankings: decision.results?.rankings?.map(r => ({
                    name: r.name,
                    score: r.normalizedScore.toFixed(1),
                    rank: r.rank
                })) || []
            };
        }
    },

    /**
     * Send a message
     */
    async sendMessage() {
        const input = document.getElementById('coach-input');
        const question = input?.value.trim();

        if (!question) return;

        input.value = '';
        this.addMessage('user', question);

        // Check if AI is configured
        if (!AI.isConfigured()) {
            this.addMessage('assistant', "I'd love to help, but the AI service isn't connected yet. Please configure the Cloudflare Worker proxy first.");
            return;
        }

        // Show typing indicator
        const typingId = this.addMessage('assistant', '<span class="typing">Thinking...</span>');

        try {
            const response = await this.askCoach(question);
            this.updateMessage(typingId, response);
        } catch (e) {
            this.updateMessage(typingId, `Sorry, I couldn't process that: ${e.message}`);
        }
    },

    /**
     * Ask the AI coach
     */
    async askCoach(question) {
        const contextStr = this.context ? `
Decision: "${this.context.title}"
Options: ${this.context.options.join(', ')}
Winner: ${this.context.winner} (Score: ${this.context.rankings[0]?.score}/10)
Runner-up: ${this.context.runnerUp} (Score: ${this.context.rankings[1]?.score}/10)
Criteria: ${this.context.criteria.map(c => `${c.name} (weight: ${c.weight})`).join(', ')}
` : 'No decision data available yet.';

        const prompt = `You are an AI decision coach. The user is making a decision and has scored their options.

Context:
${contextStr}

User's question: ${question}

Provide a helpful, concise response (2-4 sentences max). Be specific to their data. If relevant, mention specific options or criteria by name.`;

        return await AI.chat([
            { role: 'system', content: 'You are a friendly AI decision coach. Give concise, actionable advice based on the user\'s decision data.' },
            { role: 'user', content: prompt }
        ], { temperature: 0.7, maxTokens: 300 });
    },

    /**
     * Add a message to the chat
     */
    addMessage(role, content) {
        const container = document.getElementById('coach-messages');
        if (!container) return null;

        const id = `msg-${Date.now()}`;
        const msgDiv = document.createElement('div');
        msgDiv.id = id;
        msgDiv.className = `coach-message ${role}`;
        msgDiv.innerHTML = `<p>${content}</p>`;

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;

        this.messages.push({ role, content, id });
        return id;
    },

    /**
     * Update a message
     */
    updateMessage(id, content) {
        const msgEl = document.getElementById(id);
        if (msgEl) {
            msgEl.querySelector('p').innerHTML = content;
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Coach.init();
});
