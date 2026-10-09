<div align="center">

# **WVCanvasFix**

</div>

**A small extension [Spicetify](https://spicetify.app/) that prevents the Spotify desktop client from disconnecting external monitors when trying to load Canvas (animated art).**

<div align="center">

> 🇮🇹 Proudly **Made in Italy** 🍕 (Versione italiana disponibile [`README.md`](./README.md)).

</div>

## The Problem

In some configurations, typically a laptop or desktop connected to an external monitor via a USB-C dock or HDMI adapter, opening Spotify or playing a song with an animated Canvas causes the external display to disconnect for a few seconds. (Spoiler: This also happens if you disable Canvas and/or hardware acceleration from the client, because it preloads them anyway.)

In rare cases, it stays off until the PC is rebooted. The problem does not occur if the same monitor is connected to a native HDMI port (which isn't always the case), and is largely specific to Spotify: other services with DRM (Netflix, for example) at most display a very brief, barely noticeable black frame during loading, without a crash lasting several seconds.

However, it doesn't currently appear to affect HDMI-to-VGA converters.

This is a long-reported bug, and it's not tied to a specific GPU vendor, dock brand, or device hardware. This is discussed in these threads:

>- [Spotify Community — "External monitors disconnect when opening Spotify"](https://community.spotify.com/forum/it/discussion/5637974/external-monitors-disconnect-when-opening-spotify/p6)
>- [Microsoft Q&A — "Spotify briefly turning off monitor when switching songs, is there a fix?"](https://learn.microsoft.com/en-us/answers/questions/3959939/spotify-briefly-turning-off-monitor-when-switching)
>- [Intel Community — "Intel UHD - when open the Spotify app, causes black screen on external monitor (HDMI)"](https://community.intel.com/t5/Graphics/Intel-UHD-when-open-the-Spotify-app-cause-black-screen-on/m-p/1641342)
>- [Linus Tech Tips forum — "Spotify makes my monitor lose connection"](https://linustechtips.com/topic/1589008-spotify-makes-my-monitor-lose-conection/)

Generally, the problem is related to how the Widevine-based client renegotiates HDCP on the video output, so it's not a defect in the monitor, dock, or GPU driver, which is often attributed to it (even by support).

## Why it happens (simplified)

Spotify uses Widevine DRM for Canvas (the looping animated clip on the cover) and for podcast videos, the same mechanism used elsewhere for truly protected video content. Widevine initialization triggers an HDCP renegotiation on the video output. If the signal path involves a conversion that doesn't cleanly communicate HDCP compliance (common with USB-C to HDMI docks), the negotiation can glitch, and the display will disconnect temporarily or permanently until the system is rebooted.

Using Widevine for a few seconds of silent, looping animated cover art is objectively excessive for Canvas' needs, but it's the standard Spotify has adopted, and it's what triggers the bug.

## What does this extension do?

Two layers, both limited to *blocking requests before Widevine is invoked*—no decryption, no DRM bypassing, no modifications to the raw Spotify client:

>1. Patch `navigator.requestMediaKeySystemAccess` so that any request for a Widevine key system (`com.widevine.alpha`) is immediately rejected.
>2. As an additional layer, it blocks `fetch` calls to known Canvas/video CDN hosts in case assets are preloaded before step 1 kicks in.

Conceptually, this is the same principle as Pi-Hole at the DNS level, which refuses to load a specific asset.

## Compromise

**This patch disables all video content in the client.**

Currently, there's no way to keep Canvas enabled and fix this issue.

If you'd like to reduce visual "gaps" in the interface, you can still disable Canvas from Spotify's settings. This prevents the UI from trying to reserve space for a Canvas slot that will never load anyway :).

## 🚀 Installation

Requires [Spicetify](https://spicetify.app/) and the official Spotify desktop client. (The .exe version is recommended.)

```powershell
# Windows (PowerShell)
Copy-Item .\WVCanvasFix.js "$env:APPDATA\spicetify\Extensions\"
spicetify config extensions WVCanvasFix.js
spicetify apply
```

```bash
# macOS / Linux (although there are no known reports of this happening on macOS :b)
cp WVCanvasFix.js ~/.config/spicetify/Extensions/
spicetify config extensions WVCanvasFix.js
spicetify apply
```

Available on the **Spicetify Marketplace**

## Configuration (for debugging purposes only)

Two flags at the top of `WVCanvasFix.js`:

| Flag | Default | Effect |
|---|---|---|
| `DEBUG` | `false` | Also logs every *allowed* request (not Widevine) to the console. Disabled by default to avoid unnecessary console spam.|
| `SHOW_NOTIFICATION` | `true` | Shows a notification on startup in the client confirming the patch activation. In case you're not a tech geek, it's already enabled by default to show you whether the extension is active or not. |

**Tip**: To inspect what's happening in real time:

```bash
spicetify enable-devtools
```

Then open DevTools (F12) or the drop-down menu in the top left and check the Console tab.

## Language

The extension tries to be available to as many people as possible. It's available in **English** and **Italian**, automatically detected by the system/browser language, with a fallback to English for any other language. Code comments remain in English to keep the source accessible to contributors of any language.

Adding a language is a minimal change: simply add a key to the `STRINGS` object in `WVCanvasFix.js` with the same fields as the existing `en`/`it` entries.

## Disclaimer

>This tool is not intended to circumvent DRM in any way and does not encourage piracy in any way. Its sole purpose is to improve the user experience for certain users within the Spotify client.

The tool blocks a request before Spotify's Widevine module is even invoked. No encryption is broken, circumvented, or deciphered in any way.

— **Thatsvincy_**

### AI Information
The translation and automatic language detection system was created with the help of Claude (Anthropic).
The logo was generated by Gemini.