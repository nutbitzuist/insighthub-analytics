/**
 * InsightHub Analytics Tracking Script
 * Lightweight (~4KB gzipped) analytics tracker
 */

(function () {
  "use strict";

  const CONFIG = {
    apiEndpoint: "https://collect.insighthub.io",
    batchSize: 10,
    batchTimeout: 5000,
    sessionTimeout: 1800000,
  };

  let siteId = null;
  let visitorId = null;
  let sessionId = null;
  let eventQueue = [];
  let batchTimer = null;
  let options = { autoTrack: true, trackScroll: true, trackOutbound: true, respectDnt: true };

  // Generate random ID
  function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Get or create visitor ID (persistent)
  function getVisitorId() {
    if (visitorId) return visitorId;
    try {
      visitorId = localStorage.getItem("_ih_vid");
      if (!visitorId) {
        visitorId = "v_" + generateId();
        localStorage.setItem("_ih_vid", visitorId);
      }
    } catch (e) {
      visitorId = "v_" + generateId();
    }
    return visitorId;
  }

  // Get or create session ID (expires after inactivity)
  function getSessionId() {
    try {
      const stored = sessionStorage.getItem("_ih_sid");
      const lastActivity = parseInt(sessionStorage.getItem("_ih_last") || "0");
      const now = Date.now();

      if (stored && now - lastActivity < CONFIG.sessionTimeout) {
        sessionStorage.setItem("_ih_last", now.toString());
        return stored;
      }

      const newId = "s_" + generateId();
      sessionStorage.setItem("_ih_sid", newId);
      sessionStorage.setItem("_ih_last", now.toString());
      sessionStorage.setItem("_ih_new", "1");
      return newId;
    } catch (e) {
      return "s_" + generateId();
    }
  }

  // Get UTM parameters from URL
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_term: params.get("utm_term"),
      utm_content: params.get("utm_content"),
    };
  }

  // Get context data
  function getContext() {
    return {
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  }

  // Core tracking function
  function track(eventName, properties) {
    if (options.respectDnt && navigator.doNotTrack === "1") return;

    const event = {
      name: eventName,
      timestamp: Date.now(),
      properties: {
        ...properties,
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        ...getUTMParams(),
      },
      context: getContext(),
    };

    eventQueue.push(event);

    if (eventQueue.length >= CONFIG.batchSize) {
      flushEvents();
    } else if (!batchTimer) {
      batchTimer = setTimeout(flushEvents, CONFIG.batchTimeout);
    }
  }

  // Send events to server
  function flushEvents() {
    if (eventQueue.length === 0) return;

    clearTimeout(batchTimer);
    batchTimer = null;

    const events = eventQueue.splice(0, CONFIG.batchSize);
    let isNewSession = false;
    let isNewVisitor = false;

    try {
      isNewSession = sessionStorage.getItem("_ih_new") === "1";
      sessionStorage.removeItem("_ih_new");
      isNewVisitor = !localStorage.getItem("_ih_returning");
      localStorage.setItem("_ih_returning", "1");
    } catch (e) {}

    const payload = {
      events,
      session: { id: sessionId, is_new: isNewSession },
      visitor: { id: visitorId, is_new: isNewVisitor },
    };

    const url = CONFIG.apiEndpoint + "/api/collect";
    const data = JSON.stringify(payload);

    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "application/json",
          "X-Site-ID": siteId,
        },
        keepalive: true,
      }).catch(function () {});
    }
  }

  // Track page view
  function trackPageView(customProps) {
    track("page_view", customProps || {});
  }

  // SPA navigation tracking
  function setupSPATracking() {
    const originalPushState = history.pushState;
    history.pushState = function () {
      originalPushState.apply(this, arguments);
      trackPageView();
    };
    window.addEventListener("popstate", function () {
      trackPageView();
    });
  }

  // Scroll depth tracking
  function setupScrollTracking() {
    let maxScroll = 0;
    const thresholds = [25, 50, 75, 90, 100];
    const tracked = {};

    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      maxScroll = Math.max(maxScroll, scrollPercent);

      thresholds.forEach(function (threshold) {
        if (maxScroll >= threshold && !tracked[threshold]) {
          tracked[threshold] = true;
          track("scroll_depth", { depth: threshold });
        }
      });
    }

    let scrollTimer = null;
    window.addEventListener("scroll", function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        handleScroll();
      }, 500);
    }, { passive: true });
  }

  // Outbound link tracking
  function setupOutboundTracking() {
    document.addEventListener("click", function (e) {
      const link = e.target.closest("a");
      if (!link || !link.href) return;

      try {
        const url = new URL(link.href);
        if (url.hostname !== window.location.hostname) {
          track("outbound_click", {
            url: link.href,
            text: (link.textContent || "").substring(0, 100),
          });
        }
      } catch (e) {}
    });
  }

  // Page unload handler
  function setupUnloadHandler() {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        flushEvents();
      }
    });
    window.addEventListener("pagehide", flushEvents);
  }

  // Initialize
  function init(trackingId, opts) {
    siteId = trackingId;
    options = { ...options, ...opts };
    
    if (opts && opts.apiEndpoint) {
      CONFIG.apiEndpoint = opts.apiEndpoint;
    }

    visitorId = getVisitorId();
    sessionId = getSessionId();

    if (options.autoTrack !== false) {
      trackPageView();
    }

    setupSPATracking();
    
    if (options.trackScroll !== false) {
      setupScrollTracking();
    }
    
    if (options.trackOutbound !== false) {
      setupOutboundTracking();
    }

    setupUnloadHandler();

    // Dispatch ready event
    window.dispatchEvent(new CustomEvent("insighthub:ready"));
  }

  // Identify user
  function identify(userId, traits) {
    try {
      localStorage.setItem("_ih_uid", userId);
    } catch (e) {}
    track("identify", { user_id: userId, ...traits });
  }

  // Track revenue
  function revenue(data) {
    track("revenue", {
      amount: data.amount,
      currency: data.currency || "USD",
      product: data.product,
      transaction_id: data.transaction_id,
    });
  }

  // Expose public API
  window.insighthub = {
    init: init,
    track: function (name, props) { track(name, props || {}); },
    trackPageView: trackPageView,
    identify: identify,
    revenue: revenue,
  };

  // Process queued calls
  const queue = window.insighthub.q || [];
  queue.forEach(function (args) {
    const method = args[0];
    if (typeof window.insighthub[method] === "function") {
      window.insighthub[method].apply(null, Array.prototype.slice.call(args, 1));
    }
  });
})();
