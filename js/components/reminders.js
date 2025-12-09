/**
 * Smart Deadline Reminders
 * Manages notification reminders for decision deadlines
 */

const Reminders = {
    /**
     * Initialize reminders
     */
    init() {
        this.checkDeadlines();
        // Check every hour
        setInterval(() => this.checkDeadlines(), 60 * 60 * 1000);
    },

    /**
     * Check for upcoming deadlines
     */
    checkDeadlines() {
        const decisions = Storage.getDecisions();
        const now = new Date();

        decisions.forEach(decision => {
            if (!decision.constraints?.deadline) return;

            const deadline = new Date(decision.constraints.deadline);
            const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

            // Show reminders at 3 days, 1 day, and on the day
            if (daysUntil <= 3 && daysUntil >= 0) {
                const reminderKey = `reminder_shown_${decision.id}_${daysUntil}`;
                if (!sessionStorage.getItem(reminderKey)) {
                    this.showDeadlineReminder(decision, daysUntil);
                    sessionStorage.setItem(reminderKey, 'true');
                }
            }
        });
    },

    /**
     * Show deadline reminder
     */
    showDeadlineReminder(decision, daysUntil) {
        const winner = decision.results?.rankings?.[0]?.name || 'Not calculated';
        const urgencyClass = daysUntil === 0 ? 'urgent' : daysUntil === 1 ? 'soon' : 'upcoming';
        const timeText = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;

        const banner = document.createElement('div');
        banner.className = `reminder-banner ${urgencyClass}`;
        banner.innerHTML = `
            <div class="reminder-content">
                <span class="reminder-icon">⏰</span>
                <div class="reminder-text">
                    <strong>Deadline ${timeText}:</strong> ${this.escapeHtml(decision.title)}
                    <span class="reminder-winner">Current winner: ${this.escapeHtml(winner)}</span>
                </div>
                <button class="reminder-dismiss" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

        document.body.prepend(banner);

        // Also try browser notification
        this.sendBrowserNotification(decision.title, timeText, winner);
    },

    /**
     * Send browser notification if permitted
     */
    async sendBrowserNotification(title, timeText, winner) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(`Decision Deadline ${timeText}`, {
                body: `${title}\nCurrent winner: ${winner}`,
                icon: '🎯'
            });
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                new Notification(`Decision Deadline ${timeText}`, {
                    body: `${title}\nCurrent winner: ${winner}`,
                    icon: '🎯'
                });
            }
        }
    },

    /**
     * Request notification permission
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            UI.toast('Browser notifications not supported', 'warning');
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            UI.toast('Notifications enabled!', 'success');
            return true;
        } else {
            UI.toast('Notifications denied', 'warning');
            return false;
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Reminders.init();
});
