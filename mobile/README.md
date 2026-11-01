# LokSync Mobile — Android Companion App

A lightweight, secure, and power-efficient Android companion app for LokSync.
Designed with KDE Connect / Libadwaita aesthetic for seamless local Wi-Fi synchronization with your Linux desktop.

---

## ✨ Features (KDE Connect Style)

- **⚡ 1-Click Wi-Fi Discovery:** Automatically discovers your Linux desktop on Wi-Fi without manual IP or QR codes.
- **📤 LocalSend-Grade File Sharing:** High-speed direct Wi-Fi line-rate transfer for photos, videos, and documents.
- **📋 Shared Clipboard:** Send text, notes, and links from mobile directly to laptop clipboard.
- **🎵 Multimedia Remote:** Control laptop media playback (Spotify, YouTube, VLC) from your phone.
- **🔔 Notification Mirroring:** Forward incoming phone notifications to your Linux desktop via DBus.
- **🔋 Zero Battery Drain:** Low-power event-driven socket listening. No aggressive polling loops.

---

## 🛠️ Building the APK

### Automated GitHub Release
Every time a git tag is pushed (e.g. `git push origin v0.1.0`), GitHub Actions automatically builds and publishes `LokSync.apk` under the repository **Releases** tab.

### Local Build (if Flutter is installed)
```bash
cd mobile
flutter pub get
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

---

## 🔒 Security
- Pure local-network (LAN) communication over encrypted TCP sockets.
- Zero cloud servers, zero internet telemetry.
