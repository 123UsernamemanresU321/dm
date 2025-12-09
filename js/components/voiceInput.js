/**
 * Voice Input Mode
 * Enables voice commands for hands-free decision entry
 */

const VoiceInput = {
    recognition: null,
    isListening: false,

    /**
     * Initialize voice input
     */
    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('Speech recognition not supported');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);
        this.recognition.onend = () => this.onEnd();

        this.createUI();
    },

    /**
     * Create voice button UI
     */
    createUI() {
        const btn = document.createElement('button');
        btn.id = 'voice-btn';
        btn.className = 'voice-fab';
        btn.innerHTML = '🎤';
        btn.title = 'Voice Input (say "add option X" or "add criterion Y")';
        btn.addEventListener('click', () => this.toggle());
        document.body.appendChild(btn);
    },

    /**
     * Toggle listening
     */
    toggle() {
        this.isListening ? this.stop() : this.start();
    },

    /**
     * Start listening
     */
    start() {
        if (!this.recognition) {
            UI.toast('Voice input not supported in this browser', 'warning');
            return;
        }

        try {
            this.recognition.start();
            this.isListening = true;
            document.getElementById('voice-btn')?.classList.add('listening');
            UI.toast('Listening... Say a command', 'info');
        } catch (e) {
            console.error('Voice error:', e);
        }
    },

    /**
     * Stop listening
     */
    stop() {
        this.recognition?.stop();
        this.isListening = false;
        document.getElementById('voice-btn')?.classList.remove('listening');
    },

    onEnd() {
        this.isListening = false;
        document.getElementById('voice-btn')?.classList.remove('listening');
    },

    /**
     * Handle speech result
     */
    handleResult(event) {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log('Voice input:', transcript);

        // Parse commands
        if (transcript.startsWith('add option ')) {
            const name = transcript.replace('add option ', '').trim();
            DecisionForm.addOption(name);
            UI.toast(`Added option: ${name}`, 'success');
        } else if (transcript.startsWith('add criterion ') || transcript.startsWith('add criteria ')) {
            const name = transcript.replace(/add criteri(on|a) /, '').trim();
            DecisionForm.addCriterion(name, 5);
            UI.toast(`Added criterion: ${name}`, 'success');
        } else if (transcript.startsWith('set weight ')) {
            const weight = parseInt(transcript.replace('set weight ', ''));
            if (weight >= 1 && weight <= 10) {
                UI.toast(`Weight command received: ${weight}`, 'info');
            }
        } else if (transcript === 'calculate' || transcript === 'calculate recommendation') {
            DecisionForm.calculate();
        } else if (transcript.startsWith('title ') || transcript.startsWith('decision ')) {
            const title = transcript.replace(/^(title|decision) /, '').trim();
            document.getElementById('decision-title').value = title;
            DecisionForm.state.title = title;
            UI.toast(`Set title: ${title}`, 'success');
        } else {
            UI.toast(`Command not recognized: "${transcript}"`, 'warning');
        }
    },

    handleError(event) {
        console.error('Speech error:', event.error);
        if (event.error !== 'no-speech') {
            UI.toast('Voice input error: ' + event.error, 'error');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    VoiceInput.init();
});
