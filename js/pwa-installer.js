/**
 * PWA Installer Module
 * Manages mobile app installation prompt, standalone detection, and platform-specific guides
 * Follows zero-emoji guideline and provides high-aesthetic floating prompt
 */
const PWAInstaller = {
  deferredPrompt: null,
  isDismissedThisSession: false,
  isGuideOpen: false,

  init() {
    // 1. Register Service Worker if supported
    this.registerServiceWorker();

    // 2. Intercept beforeinstallprompt event (Chromium / Android / Edge)
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.checkAndRender();
    });

    // 3. Listen for appinstalled event
    window.addEventListener("appinstalled", () => {
      this.deferredPrompt = null;
      this.removeFloatingPrompt();
      if (typeof Utils !== "undefined" && Utils.showToast) {
        Utils.showToast("ติดตั้ง PolicePrep บนอุปกรณ์เรียบร้อยแล้ว", "success");
      }
    });

    // 4. Listen for route navigation
    window.addEventListener("hashchange", () => {
      this.handleRouteChange();
    });

    // 5. Initial check on startup
    setTimeout(() => {
      this.checkAndRender();
    }, 600);
  },

  /**
   * Check if app is running in installed standalone mode
   * If true: User has already installed the app on mobile/desktop
   */
  isStandalone() {
    try {
      const isStandaloneMedia = window.matchMedia && (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches
      );
      const isNavStandalone = window.navigator && window.navigator.standalone === true;
      const isAndroidApp = document.referrer && document.referrer.includes("android-app://");
      
      return !!(isStandaloneMedia || isNavStandalone || isAndroidApp);
    } catch (e) {
      return false;
    }
  },

  /**
   * Detect iOS / iPadOS device
   */
  isIOS() {
    const nav = (typeof window !== "undefined" && window.navigator) ? window.navigator : (typeof navigator !== "undefined" ? navigator : {});
    const ua = nav.userAgent || "";
    const platform = nav.platform || "";
    const maxTouchPoints = nav.maxTouchPoints || 0;
    return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
  },

  /**
   * Detect mobile device or small screen viewport
   */
  isMobile() {
    const nav = (typeof window !== "undefined" && window.navigator) ? window.navigator : (typeof navigator !== "undefined" ? navigator : {});
    const ua = nav.userAgent || "";
    const isMobileUA = /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry/i.test(ua);
    const isTouchScreen = (typeof window !== "undefined" && "ontouchstart" in window) || ((nav.maxTouchPoints || 0) > 0);
    const winWidth = typeof window !== "undefined" && window.innerWidth ? window.innerWidth : 1024;
    return isMobileUA || (winWidth <= 768 && isTouchScreen);
  },

  /**
   * Register Service Worker
   */
  registerServiceWorker() {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("PWA Service Worker registration skipped:", err);
      });
    }
  },

  /**
   * Handle route change (only show on homepage #dashboard)
   */
  handleRouteChange() {
    const hash = window.location.hash || "#dashboard";
    const isHomepage = hash === "" || hash === "#" || hash.startsWith("#dashboard");

    if (!isHomepage) {
      this.removeFloatingPrompt();
    } else {
      this.checkAndRender();
    }
  },

  /**
   * Determine whether to show prompt and render
   */
  checkAndRender() {
    // 1. If already installed in standalone mode: DO NOT SHOW!
    if (this.isStandalone()) {
      this.removeFloatingPrompt();
      return;
    }

    // 2. Only show on homepage / dashboard
    const hash = window.location.hash || "#dashboard";
    const isHomepage = hash === "" || hash === "#" || hash.startsWith("#dashboard");
    if (!isHomepage) {
      this.removeFloatingPrompt();
      return;
    }

    // 3. If closed during this current session, do not interrupt
    if (this.isDismissedThisSession) {
      return;
    }

    // 4. Render floating prompt
    this.renderFloatingPrompt();
  },

  /**
   * Render or update floating install banner
   */
  renderFloatingPrompt() {
    // Avoid duplicate banners
    let banner = document.getElementById("pwa-floating-install-banner");
    if (banner) return;

    const isIOSDevice = this.isIOS();
    const canPromptDirectly = !!this.deferredPrompt;

    banner = document.createElement("div");
    banner.id = "pwa-floating-install-banner";
    banner.className = "pwa-install-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "ติดตั้งแอป PolicePrep บนโทรศัพท์มือถือ");

    banner.innerHTML = `
      <div class="pwa-banner-header">
        <div class="pwa-banner-icon">
          ${Icons.shieldCheck ? Icons.shieldCheck() : Icons.smartphone()}
        </div>
        <div class="pwa-banner-content">
          <div class="pwa-banner-badge">
            ${Icons.smartphone("w-3 h-3")}
            <span>แอปมือถือ</span>
          </div>
          <h4 class="pwa-banner-title">ติดตั้ง PolicePrep® บนมือถือ</h4>
          <p class="pwa-banner-desc">เปิดใช้งานสะดวก โหลดไว เต็มจอ ไม่ต้องพิมพ์ URL</p>
        </div>
        <button class="pwa-banner-close" onclick="PWAInstaller.dismiss()" title="ปิดการแจ้งเตือน" aria-label="ปิดการแจ้งเตือน">
          ${Icons.close()}
        </button>
      </div>

      <div class="pwa-banner-actions">
        <button class="pwa-banner-btn-install" onclick="PWAInstaller.handleInstallAction()">
          ${Icons.download()}
          <span>${canPromptDirectly ? "ติดตั้งแอปทันที" : (isIOSDevice ? "วิธีติดตั้งบน iPhone" : "ติดตั้งลงเครื่อง")}</span>
        </button>
        <button class="pwa-banner-btn-secondary" onclick="PWAInstaller.toggleGuide()">
          ${Icons.lightbulb ? Icons.lightbulb() : Icons.fontSize()}
          <span id="pwa-guide-btn-text">${this.isGuideOpen ? "ซ่อนคำแนะนำ" : "วิธีติดตั้ง"}</span>
        </button>
      </div>

      <div id="pwa-install-guide-container" style="display: ${this.isGuideOpen ? 'block' : 'none'};">
        ${this.renderGuideContent(isIOSDevice)}
      </div>
    `;

    document.body.appendChild(banner);
  },

  /**
   * Render platform-tailored installation guide
   */
  renderGuideContent(isIOS) {
    if (isIOS) {
      return `
        <div class="pwa-install-guide">
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            ${Icons.share()} คำแนะนำติดตั้งสำหรับ iOS / Safari:
          </div>
          <div class="pwa-guide-step">
            <span class="pwa-guide-num">1</span>
            <div>แตะปุ่ม <span class="pwa-guide-icon-pill">${Icons.share()} แชร์</span> ที่แถบเมนูด้านล่างของ Safari</div>
          </div>
          <div class="pwa-guide-step">
            <span class="pwa-guide-num">2</span>
            <div>เลื่อนลงแล้วแตะ <span class="pwa-guide-icon-pill">${Icons.plus()} เพิ่มไปยังหน้าจอโฮม</span></div>
          </div>
          <div class="pwa-guide-step">
            <span class="pwa-guide-num">3</span>
            <div>แตะ <span class="pwa-guide-icon-pill">เพิ่ม (Add)</span> ที่มุมบนขวา เพื่อเริ่มใช้งานแบบแอปเต็มจอ</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="pwa-install-guide">
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          ${Icons.smartphone()} คำแนะนำติดตั้งสำหรับ Android / Chrome:
        </div>
        <div class="pwa-guide-step">
          <span class="pwa-guide-num">1</span>
          <div>แตะเมนูจุด 3 จุด <span class="pwa-guide-icon-pill">${Icons.moreVertical ? Icons.moreVertical() : Icons.sliders()}</span> ที่มุมบนขวาของเบราว์เซอร์</div>
        </div>
        <div class="pwa-guide-step">
          <span class="pwa-guide-num">2</span>
          <div>เลือก <span class="pwa-guide-icon-pill">${Icons.download()} ติดตั้งแอป</span> หรือ <span class="pwa-guide-icon-pill">เพิ่มลงในหน้าจอหลัก</span></div>
        </div>
        <div class="pwa-guide-step">
          <span class="pwa-guide-num">3</span>
          <div>กดยืนยัน <span class="pwa-guide-icon-pill">ติดตั้ง</span> เพื่อเปิดใช้งานเหมือนแอปจริง</div>
        </div>
      </div>
    `;
  },

  /**
   * Toggle guide container
   */
  toggleGuide() {
    this.isGuideOpen = !this.isGuideOpen;
    const guideEl = document.getElementById("pwa-install-guide-container");
    const btnText = document.getElementById("pwa-guide-btn-text");
    if (guideEl) {
      guideEl.style.display = this.isGuideOpen ? "block" : "none";
    }
    if (btnText) {
      btnText.textContent = this.isGuideOpen ? "ซ่อนคำแนะนำ" : "วิธีติดตั้ง";
    }
  },

  /**
   * Handle Install Button Click
   */
  async handleInstallAction() {
    if (this.deferredPrompt) {
      // Android / Chromium native install prompt
      try {
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          if (typeof Utils !== "undefined" && Utils.showToast) {
            Utils.showToast("กำลังติดตั้ง PolicePrep ลงในอุปกรณ์ของคุณ...", "info");
          }
          this.deferredPrompt = null;
          this.removeFloatingPrompt();
        }
      } catch (err) {
        console.warn("Install prompt error:", err);
        this.toggleGuide();
      }
    } else {
      // iOS Safari or browser without deferred prompt -> open step-by-step guide
      if (!this.isGuideOpen) {
        this.toggleGuide();
      }
      if (typeof Utils !== "undefined" && Utils.showToast) {
        Utils.showToast("ปฏิบัติตาม 3 ขั้นตอนเพื่อเพิ่มไปยังหน้าจอหลักได้ทันที", "info");
      }
    }
  },

  /**
   * Dismiss prompt for this active browsing session
   * Keeps showing again on next session if app is still not installed
   */
  dismiss() {
    this.isDismissedThisSession = true;
    this.removeFloatingPrompt();
  },

  /**
   * Remove prompt from DOM with smooth animation
   */
  removeFloatingPrompt() {
    const banner = document.getElementById("pwa-floating-install-banner");
    if (banner) {
      banner.classList.add("closing");
      setTimeout(() => {
        if (banner && banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
      }, 250);
    }
  }
};

// Export to window
if (typeof window !== "undefined") {
  window.PWAInstaller = PWAInstaller;
}

// Auto-initialize when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  PWAInstaller.init();
});
