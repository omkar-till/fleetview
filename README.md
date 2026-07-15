# FleetView

Open-source device management for small teams. Allocate company devices to people, transfer a device to someone else with a 4-digit PIN right on the device, and watch every device's live location on a map — all from one free deployment.

**Portal** (desktop) · **Device app** (PWA, runs on the managed device — no app store needed)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/omkar-till/fleetview)

## Features

- 🏢 **Multi-tenant** — sign up creates your company workspace; everything is scoped to it
- 📱 **Enroll any device in seconds** — add a device in the portal, get a 6-character code + QR, open `/device` on the device and enter it
- 👥 **People & PINs** — every person gets a private 4-digit transfer PIN (shown once, stored hashed)
- 🔁 **PIN transfer on the device** — hand a device to a teammate; they tap *Transfer*, enter their PIN, and the portal updates instantly with a full audit trail
- 🗺️ **Live location** — the device app shares location (with the holder's consent) every minute; see all devices on the portal map, plus a per-device location trail and history
- 🔋 Battery level, online/offline status, activity timeline
- 📲 **Installable PWA** — "Add to Home Screen", works on Android and iOS

## Quick start (local)

```bash
git clone <this repo> && cd fleetview
npm install
cp .env.example .env   # set DATABASE_URL (any Postgres) and JWT_SECRET
npm run dev            # API on :3000, web on :5173
```

Open <http://localhost:5173>, create your company, add a device, then open <http://localhost:5173/device> in another browser/phone to enroll it.

Tables are created automatically on first boot — no migration step.

## Deploy for free (Render + Neon)

1. **Database (2 min):** create a free project at [neon.tech](https://neon.tech) and copy the connection string (`postgres://...sslmode=require`). Neon's free tier does not expire.
2. **Fork/push this repo to GitHub.**
3. **Render:** go to [dashboard.render.com](https://dashboard.render.com) → *New* → *Blueprint*, pick your repo. Render reads [`render.yaml`](render.yaml), provisions the free web service, and prompts you for `DATABASE_URL` — paste the Neon string. `JWT_SECRET` is generated automatically.
4. Done. Your portal is at `https://<your-app>.onrender.com`, the device app at `https://<your-app>.onrender.com/device`.

> **Free tier note:** Render free services sleep after ~15 min of inactivity and take ~30s to wake on the next request. Location pings from open device apps keep it awake during the workday.

## How it works

| Piece | Tech |
| --- | --- |
| Portal + device PWA | React 18, Vite, React Router — one SPA, two experiences |
| Map | Leaflet + OpenStreetMap tiles (free) |
| API | Express, JWT session cookies (portal) + bearer device tokens |
| Database | Postgres (`pg`), schema auto-migrates on boot |
| Auth secrets | bcrypt-hashed passwords & PINs, SHA-256-hashed device tokens |

### Device flow

```text
Portal: Add device  →  enrollment code / QR
Device: open /device → enter code → receives permanent device token
Device: shares location every 60s while open (user-controlled toggle)
Anyone: taps Transfer → enters their PIN → device reassigned + event logged
```

### Privacy

Location is only sent while the device app is open **and** the sharing toggle is on. PINs and passwords are stored as bcrypt hashes; device tokens as SHA-256 hashes. Each company only ever sees its own data.

## Project layout

```text
server/          Express API (auth, users, devices, device endpoints)
src/portal/      Company portal (dashboard, devices, people, live map)
src/device/      Device PWA (enroll, PIN pad, location sharing)
src/components/  Shared UI kit + Leaflet wrapper
public/          PWA manifest, service worker, icons
render.yaml      One-click Render blueprint
```

## License

[MIT](LICENSE)
