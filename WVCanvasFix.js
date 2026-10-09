// wvcanvasfix.js — Spicetify extension
// Version: 1.05v
//
// Purpose: prevents Spotify from initializing Widevine for Canvas (looping
// cover animations) and video podcasts. Widevine initialization triggers an
// HDCP renegotiation on the video output, which on some external-monitor
// setups (notably USB-C docks / HDMI converters that don't cleanly report
// HDCP compliance) causes the monitor to disconnect for a few seconds —
// sometimes until a reboot. This is a known, long-standing bug reported in
// the official Spotify community (Desktop-Windows), not something specific
// to any one GPU/dock vendor.
//
// The bug can occur even with Canvas disabled in Spotify's own settings 
// the client still fetches/initializes the Canvas pipeline in the
// background in some versions. This extension blocks it at the source
// instead of relying on that setting.
//
// Strategy: patch navigator.requestMediaKeySystemAccess so every request
// for a Widevine key system rejects immediately, before the CDM is even
// loaded. Spotify should then simply fall back to a static cover instead
// of the animated Canvas, without ever touching the HDCP/HDMI pipeline.
// A network-level block on known Canvas/video CDN hosts is layered on top,
// in case some assets are prefetched before the Widevine request fires.
//
// Trade-off: applying this patch disables ALL video content in the
// Spotify client (Canvas animations, video podcasts). There is currently
// no way to block only the broken path and keep the rest — that's the
// "overkill" nature of the underlying bug, not a limitation of this fix.
// If you'd rather not lose Canvas entirely while testing, you can still
// turn Canvas off in Spotify's own settings — purely cosmetic once this
// patch is active (the UI won't try to show a canvas slot at all), but
// has no effect on whether the fix is needed.
//
// Install (Spicetify + Spotify client required):
//   Windows: copy this file to %appdata%\spicetify\Extensions\
//   macOS/Linux: copy this file to ~/.config/spicetify/Extensions/
//   then:
//     spicetify config extensions wvcanvasfix.js
//     spicetify apply
//
// Debug:
//   spicetify enable-devtools
//   then open DevTools (F12) inside the Spotify client and check Console.
//   Set DEBUG to true below to also log every ALLOWED (non-blocked) request.

const DEBUG = false; // set to true to log non-blocked key system requests too (console noise otherwise)
const SHOW_NOTIFICATION = true; // set to false to skip the on-load Spotify notification

(function WVCanvasFix() {
    // Console/user-facing strings only. Code comments stay in English so
    // the source is readable for contributors regardless of locale; add a
    // language by adding a key here and it'll be picked up automatically
    // for any matching browser/OS locale (falls back to English otherwise).
    const STRINGS = {
        en: {
            noApi: "navigator.requestMediaKeySystemAccess doesn't exist in this context — nothing to patch.",
            patchApplied: (list) => `Patch applied. Widevine will be rejected for: ${list.join(", ")}`,
            requestBlocked: (keySystem) => `Blocked request for keySystem="${keySystem}"`,
            requestAllowed: (keySystem) => `Request not blocked, passing through to Spotify: "${keySystem}"`,
            rejectReason: "Widevine disabled by WVCanvasFix (anti HDCP-disconnect patch)",
            fetchBlocked: (url) => `Blocked fetch to: ${url}`,
            notification: "WVCanvasFix active: Canvas/DRM video disabled to prevent external monitor disconnects",
        },
        it: {
            noApi: "navigator.requestMediaKeySystemAccess non esiste in questo contesto — nulla da patchare.",
            patchApplied: (list) => `Patch applicata. Widevine verrà rifiutato per: ${list.join(", ")}`,
            requestBlocked: (keySystem) => `Richiesta bloccata per keySystem="${keySystem}"`,
            requestAllowed: (keySystem) => `Richiesta NON bloccata, passo a Spotify: "${keySystem}"`,
            rejectReason: "Widevine disabilitato da WVCanvasFix (patch anti disconnessione HDCP)",
            fetchBlocked: (url) => `Fetch bloccato verso: ${url}`,
            notification: "WVCanvasFix attivo: Canvas/video DRM disabilitati per evitare disconnessioni del monitor esterno",
        },
    };

    function detectLocale() {
        const lang = (navigator.language || "en").slice(0, 2).toLowerCase();
        return STRINGS[lang] ? lang : "en";
    }

    const t = STRINGS[detectLocale()];
    const LOG_PREFIX = "[WVCanvasFix]";

    // --- Widevine request blocking --------------------------------------
    const BLOCKED_KEY_SYSTEMS = [
        "com.widevine.alpha",
        // Add variants here if you spot others in the console
        // (e.g. "com.widevine.alpha.experiment").
    ];

    if (!navigator.requestMediaKeySystemAccess) {
        console.warn(LOG_PREFIX, t.noApi);
        return;
    }

    const originalRequestMediaKeySystemAccess =
        navigator.requestMediaKeySystemAccess.bind(navigator);

    navigator.requestMediaKeySystemAccess = function (keySystem, configs) {
        const isBlocked = BLOCKED_KEY_SYSTEMS.some((blocked) =>
            keySystem.toLowerCase().includes(blocked)
        );

        if (isBlocked) {
            console.log(LOG_PREFIX, t.requestBlocked(keySystem));
            return Promise.reject(new DOMException(t.rejectReason, "NotSupportedError"));
        }

        // IMPORTANT: this must always run for non-blocked key systems,
        // regardless of DEBUG — DEBUG only controls the log line below.
        // (A previous build accidentally gated the real call on DEBUG,
        // which silently broke any non-Widevine key system request.)
        if (DEBUG) {
            console.log(LOG_PREFIX, t.requestAllowed(keySystem));
        }
        return originalRequestMediaKeySystemAccess(keySystem, configs);
    };

    console.log(LOG_PREFIX, t.patchApplied(BLOCKED_KEY_SYSTEMS));

    // --- Network-level fallback -----------------------------------------
    // In case Spotify prefetches Canvas/video assets before it even calls
    // requestMediaKeySystemAccess, also block fetches to known CDN hosts.
    // Check DevTools' Network tab (filter "canvas" / "video") if Spotify
    // changes these in a future client update, and add any new hosts here.
    const BLOCKED_HOSTS = [
        "canvaz.scdn.co",
        "canvas.scdn.co",
        "video-fa.scdn.co",
    ];

    const originalFetch = window.fetch.bind(window);
    window.fetch = function (...args) {
        const url = args[0] instanceof Request ? args[0].url : String(args[0]);
        if (BLOCKED_HOSTS.some((host) => url.includes(host))) {
            console.log(LOG_PREFIX, t.fetchBlocked(url));
            return Promise.reject(new Error("Blocked by WVCanvasFix (network layer)"));
        }
        return originalFetch(...args);
    };

    // --- Optional on-load notification -----------------------------------
    // Lets people who never open DevTools confirm the patch is active.
    // Spicetify's API may not be ready the instant this script runs, so
    // retry briefly instead of assuming `Spicetify` exists immediately.
    if (SHOW_NOTIFICATION) {
        let attempts = 0;
        const tryNotify = setInterval(() => {
            attempts++;
            if (typeof Spicetify !== "undefined" && Spicetify.showNotification) {
                Spicetify.showNotification(t.notification);
                clearInterval(tryNotify);
            } else if (attempts > 20) {
                clearInterval(tryNotify); // give up quietly after ~5s
            }
        }, 250);
    }
})();