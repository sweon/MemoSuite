export const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    // Reset synthesis to avoid queue buildups or stuck states
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Keeping the existing rate preference

    const voices = window.speechSynthesis.getVoices();
    // Try to find a US English voice
    // Preference order: Google US English -> Microsoft US English -> Any en-US -> Any en
    const usVoice = voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.name.includes('US English')) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en'));

    if (usVoice) {
        utterance.voice = usVoice;
        // Explicitly setting lang helps some engines even if voice object is set
        utterance.lang = usVoice.lang;
    } else {
        // Fallback if no specific US voice found, though most systems have one
        utterance.lang = 'en-US';
    }

    window.speechSynthesis.speak(utterance);
};

// Ensure voices are loaded (for Chrome)
if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
        // Just to ensure voices are populated
        window.speechSynthesis.getVoices();
    };
}
