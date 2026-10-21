/**
 * AudioManager Module
 * Centralized Web Speech API Text-to-Speech (TTS) Engine
 * - Default: Google US/UK English Female voice (or natural female fallback)
 * - Persistent configuration stored in ProgressStore (audioVoice, audioRate)
 * - Shared across Oxford 3000 Flashcard Studio, Vocabulary Bank, and UI Settings
 */
const AudioManager = {
  voices: [],
  isReady: false,

  init() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const populate = () => {
      try {
        const list = synth.getVoices() || [];
        if (list.length > 0) {
          this.voices = list;
          this.isReady = true;
          // Notify any listening components
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("audiomanager:voicesready", { detail: { count: list.length } }));
          }
        }
      } catch (e) {
        console.warn("AudioManager voice population warning:", e);
      }
    };

    populate();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = populate;
    }
  },

  /**
   * Return all English voices available in current environment
   */
  getAvailableVoices() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const list = window.speechSynthesis.getVoices() || [];
      if (list.length > 0) this.voices = list;
    }
    const en = this.voices.filter(v => (v.lang || "").toLowerCase().startsWith("en"));
    return en.length > 0 ? en : this.voices;
  },

  /**
   * Find default voice matching User's request:
   * Prioritizes Google English Female voice, then Google English, then OS natural female voice
   */
  getDefaultVoice() {
    const en = this.getAvailableVoices();
    if (en.length === 0) return null;

    // 1. Google English female voice (e.g., "Google UK English Female")
    const googleFemale = en.find(v => {
      const n = (v.name || "").toLowerCase();
      return n.includes("google") && n.includes("female");
    });
    if (googleFemale) return googleFemale;

    // 2. Google US English (standard female voice in Chrome)
    const googleUS = en.find(v => {
      const n = (v.name || "").toLowerCase();
      return n.includes("google") && (v.lang === "en-US" || n.includes("us"));
    });
    if (googleUS) return googleUS;

    // 3. Any Google English voice
    const googleAny = en.find(v => (v.name || "").toLowerCase().includes("google"));
    if (googleAny) return googleAny;

    // 4. Recognized high-quality female English voices on OS (Mac, iOS, Windows, Android)
    const femaleNames = ["samantha", "victoria", "karen", "jenny", "aria", "zira", "serena", "moira", "fiona", "tessa", "female"];
    const naturalFemale = en.find(v => {
      const n = (v.name || "").toLowerCase();
      return femaleNames.some(fn => n.includes(fn));
    });
    if (naturalFemale) return naturalFemale;

    // 5. Standard en-US or en-GB
    const standardUS = en.find(v => v.lang === "en-US") || en.find(v => (v.lang || "").startsWith("en"));
    return standardUS || en[0];
  },

  /**
   * Resolve active voice:
   * 1. Accent override hint (US/GB) if requested specifically
   * 2. User saved selection in ProgressStore
   * 3. Default Google Female voice
   */
  getActiveVoice(accentHint = null) {
    const en = this.getAvailableVoices();
    if (en.length === 0) return null;

    if (accentHint) {
      const match = en.find(v => (v.lang || "").toLowerCase().includes(accentHint.toLowerCase()));
      if (match) return match;
    }

    const settings = (typeof ProgressStore !== "undefined") ? ProgressStore.getSettings() : {};
    if (settings && settings.audioVoice) {
      const userChoice = en.find(v => v.name === settings.audioVoice);
      if (userChoice) return userChoice;
    }

    return this.getDefaultVoice();
  },

  /**
   * Get active playback rate (0.75x, 1.0x, 1.25x)
   */
  getRate() {
    const settings = (typeof ProgressStore !== "undefined") ? ProgressStore.getSettings() : {};
    return parseFloat(settings?.audioRate) || 0.85;
  },

  /**
   * Speak English text
   */
  speak(text, accentHint = null) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (typeof Utils !== "undefined") {
        Utils.showToast("เบราว์เซอร์ไม่รองรับ Web Speech API", "warning");
      }
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel(); // Stop active utterance

    const clean = (text || "").replace(/["\/]/g, "").trim();
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = this.getRate();

    const voice = this.getActiveVoice(accentHint);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-US";
    }

    synth.speak(utterance);
  },

  /**
   * Play test sentence to verify voice and rate in Settings
   */
  testVoice(voiceName = null, customRate = null) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance("Hello! This is Oxford 3000 vocabulary studio.");
    utterance.rate = customRate !== null ? parseFloat(customRate) : this.getRate();

    const en = this.getAvailableVoices();
    if (voiceName && en.length > 0) {
      const match = en.find(v => v.name === voiceName);
      if (match) utterance.voice = match;
    } else {
      const active = this.getActiveVoice();
      if (active) utterance.voice = active;
    }

    synth.speak(utterance);
  }
};

if (typeof window !== "undefined") {
  window.AudioManager = AudioManager;
  AudioManager.init();
}
