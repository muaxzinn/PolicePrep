/**
 * Router Module
 * Hash-based minimal client-side routing supporting deep links, query parameters, and navigation states
 */
const Router = {
  routes: {},
  currentRoute: "",

  init() {
    window.addEventListener("hashchange", () => this.handleRouting());
    this.handleRouting();
  },

  register(route, handler) {
    this.routes[route] = handler;
  },

  handleRouting() {
    const rawHash = window.location.hash.slice(1) || "dashboard";
    const [path, queryString] = rawHash.split("?");
    const params = new URLSearchParams(queryString || "");
    let cleanPath = path || "dashboard";

    // Support slash-based subroutes like #exam/05 or #content/02
    if (cleanPath.includes("/")) {
      const parts = cleanPath.split("/");
      const rootPath = parts[0];
      if (rootPath === "exam" && parts[1]) {
        cleanPath = "exam";
        if (!params.has("subject")) params.set("subject", parts[1]);
      } else if (rootPath === "content" && parts[1]) {
        cleanPath = "content";
        if (!params.has("subject")) params.set("subject", parts[1]);
        if (parts[2] && !params.has("page")) params.set("page", parts[2]);
      } else if (rootPath === "oxford" && parts[1]) {
        cleanPath = "oxford";
        if (!params.has("level")) params.set("level", parts[1]);
      }
    }

    this.currentRoute = cleanPath;
    this.updateActiveNav(cleanPath);

    // If navigating away from exam, stop the timer
    if (cleanPath !== "exam" && typeof ExamEngine !== "undefined" && ExamEngine.stopTimer) {
      ExamEngine.stopTimer();
    }

    const handler = this.routes[cleanPath] || this.routes["dashboard"];
    const mainContainer = document.getElementById("main-container");

    if (handler && mainContainer) {
      handler(mainContainer, params);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  },

  updateActiveNav(route) {
    // Desktop links
    document.querySelectorAll(".desktop-nav .nav-link").forEach(link => {
      const target = link.getAttribute("data-route");
      if (target === route) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Mobile bottom nav links
    document.querySelectorAll(".mobile-bottom-nav .bottom-nav-item").forEach(link => {
      const target = link.getAttribute("data-route");
      if (target === route) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  },

  navigate(route, paramsObj = null) {
    let url = `#${route}`;
    if (paramsObj) {
      const query = new URLSearchParams(paramsObj).toString();
      if (query) url += `?${query}`;
    }
    window.location.hash = url;
  }
};

if (typeof window !== "undefined") {
  window.Router = Router;
}
