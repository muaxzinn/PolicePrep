/**
 * Utility functions for DOM, Formatting, LocalStorage, and Safe Operations
 */
const Utils = {
  /**
   * Escape HTML to prevent XSS injection
   */
  escapeHtml(str) {
    if (!str || typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
   * Debounce execution
   */
  debounce(func, wait = 250) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  /**
   * Safe localStorage get
   */
  getStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn("Storage read failed for key:", key, e);
      return defaultValue;
    }
  },

  /**
   * Safe localStorage set
   */
  setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Storage write failed for key:", key, e);
      return false;
    }
  },

  /**
   * Safe localStorage remove
   */
  removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Format seconds to mm:ss or hh:mm:ss
   */
  formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${pad(hrs)}:${pad(remMins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  },

  /**
   * Format date to Thai readable string
   */
  formatThaiDate(timestamp) {
    if (!timestamp) return "-";
    const d = new Date(timestamp);
    const months = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const year = d.getFullYear() + 543;
    return `${d.getDate()} ${months[d.getMonth()]} ${year} (${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} น.)`;
  },

  /**
   * Show Toast Notification
   */
  showToast(message, type = "info") {
    if (typeof document === "undefined") {
      return;
    }
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconSvg = Icons.check();
    if (type === "warning") iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    if (type === "danger") iconSvg = Icons.close();

    toast.innerHTML = `<span>${iconSvg}</span><span>${Utils.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.2s ease";
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  },

  /**
   * Safe Fisher-Yates array shuffle
   */
  shuffleArray(arr) {
    if (!Array.isArray(arr)) return [];
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
};

if (typeof window !== "undefined") {
  window.Utils = Utils;
}
