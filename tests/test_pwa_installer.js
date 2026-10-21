/**
 * Automated Test Suite for PWA Mobile Install Floating Prompt
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Mock Browser Environment
global.window = global;
global.window.location = { hash: '#dashboard', protocol: 'http:' };
global.window.addEventListener = () => {};
global.window.matchMedia = (query) => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
};

const mockNav = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  platform: 'iPhone',
  maxTouchPoints: 5,
  standalone: false
};
Object.defineProperty(global, 'navigator', {
  value: mockNav,
  configurable: true,
  writable: true
});
global.window.mockNav = mockNav;
global.document = {
  referrer: '',
  body: {
    appendChild: (el) => {
      global.document.elements.set(el.id, el);
      el.parentNode = global.document.body;
      return el;
    }
  },
  elements: new Map(),
  getElementById: (id) => global.document.elements.get(id) || null,
  createElement: (tag) => {
    return {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      attributes: {},
      style: {},
      innerHTML: '',
      parentNode: null,
      classList: {
        add: function(cls) { this[cls] = true; },
        remove: function(cls) { delete this[cls]; }
      },
      setAttribute: function(k, v) { this.attributes[k] = v; },
      getAttribute: function(k) { return this.attributes[k]; },
      removeChild: function(child) {
        if (child && child.id) {
          global.document.elements.delete(child.id);
        }
      }
    };
  }
};
global.navigator = global.window.navigator;

// Load Modules
require(path.join(ROOT_DIR, 'js/icons.js'));
require(path.join(ROOT_DIR, 'js/utils.js'));
require(path.join(ROOT_DIR, 'js/pwa-installer.js'));

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTestSuite() {
  console.log("=== Testing PWA Mobile Install Floating Prompt ===\n");

  // Test 1: Device Detection
  console.log("Test 1: Testing Device Detection");
  assert(PWAInstaller.isIOS() === true, "Must detect iPhone as iOS");
  assert(PWAInstaller.isMobile() === true, "Must detect iPhone as Mobile");
  console.log("  ✓ iOS and Mobile detection verified.\n");

  // Test 2: Standalone Detection (When Not Installed)
  console.log("Test 2: Standalone Detection (Browser Mode / Not Installed)");
  assert(PWAInstaller.isStandalone() === false, "Must return false when running in regular browser tab");
  console.log("  ✓ Non-standalone state verified.\n");

  // Test 3: Rendering on Homepage (#dashboard)
  console.log("Test 3: Rendering Floating Banner on Homepage");
  PWAInstaller.checkAndRender();
  let banner = document.getElementById("pwa-floating-install-banner");
  assert(banner !== null, "Floating banner must be created in document on #dashboard");
  assert(banner.innerHTML.includes("ติดตั้ง PolicePrep"), "Banner must contain install title");
  assert(banner.innerHTML.includes("วิธีติดตั้ง"), "Banner must have guide trigger");
  console.log("  ✓ Floating banner rendered successfully on #dashboard.\n");

  // Test 4: Route Awareness
  console.log("Test 4: Route Awareness (Hides on Non-Dashboard routes)");
  window.location.hash = "#exam";
  PWAInstaller.handleRouteChange();
  // Banner should be removed
  banner = document.getElementById("pwa-floating-install-banner");
  // In mock, removeFloatingPrompt sets closing and triggers remove
  assert(banner === null || banner.classList['closing'] === true, "Banner must be removed or marked closing on #exam");
  console.log("  ✓ Banner cleanly hides when navigating away from homepage.\n");

  // Return to homepage
  console.log("Test 5: Returning to Homepage (#dashboard)");
  window.location.hash = "#dashboard";
  document.elements.clear();
  PWAInstaller.checkAndRender();
  banner = document.getElementById("pwa-floating-install-banner");
  assert(banner !== null, "Banner must reappear when returning to #dashboard");
  console.log("  ✓ Banner reappears when returning to homepage.\n");

  // Test 6: Standalone Mode (Installed App -> MUST NEVER SHOW!)
  console.log("Test 6: Standalone Mode (Already Installed App -> NEVER SHOW!)");
  document.elements.clear();
  // Simulate installed standalone
  mockNav.standalone = true;
  assert(PWAInstaller.isStandalone() === true, "isStandalone must return true when navigator.standalone is true");
  PWAInstaller.checkAndRender();
  banner = document.getElementById("pwa-floating-install-banner");
  assert(banner === null, "Floating banner MUST NOT render when running in standalone mode (already installed)!");
  console.log("  ✓ Banner is strictly suppressed when already installed in standalone mode.\n");

  // Reset standalone
  mockNav.standalone = false;

  // Test 7: Zero Emojis Compliance
  console.log("Test 7: Zero Emojis Compliance in pwa-installer.js");
  const pwaCode = fs.readFileSync(path.join(ROOT_DIR, 'js/pwa-installer.js'), 'utf8');
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emojiRegex.test(pwaCode), "pwa-installer.js must NOT contain any emojis!");
  console.log("  ✓ Zero emojis detected in js/pwa-installer.js (100% SVG Icons via Icons.*).\n");

  // Test 8: Manifest and SW file existence
  console.log("Test 8: Manifest and Service Worker Assets Verification");
  assert(fs.existsSync(path.join(ROOT_DIR, 'manifest.webmanifest')), "manifest.webmanifest must exist");
  assert(fs.existsSync(path.join(ROOT_DIR, 'sw.js')), "sw.js must exist");
  assert(fs.existsSync(path.join(ROOT_DIR, 'assets/icons/icon.svg')), "icon.svg must exist");
  assert(fs.existsSync(path.join(ROOT_DIR, 'assets/icons/icon-192.png')), "icon-192.png must exist");
  assert(fs.existsSync(path.join(ROOT_DIR, 'assets/icons/icon-512.png')), "icon-512.png must exist");
  
  const manifestContent = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'manifest.webmanifest'), 'utf8'));
  assert(manifestContent.display === 'standalone', "manifest display must be standalone");
  assert(manifestContent.icons.length >= 2, "manifest must contain at least 2 icons");
  console.log("  ✓ PWA Manifest, Service Worker, and Icon assets verified.\n");

  console.log("==================================================================");
  console.log("🎉 ALL 8 PWA INSTALLER TESTS PASSED FLAWLESSLY! 🎉");
  console.log("==================================================================");
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
