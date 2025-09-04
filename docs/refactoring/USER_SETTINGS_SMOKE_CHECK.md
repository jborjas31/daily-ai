# User Settings – Manual Smoke Check

Prerequisites
- Firebase project configured (Auth + Firestore). See `docs/specs/FIREBASE_SETUP_GUIDE.md`.
- App served via localhost or deployed (service worker requires http(s)).

Scenarios

1) New user defaults
- Sign out if logged in.
- Create a new test account via the app (email/password).
- After login, open Settings view.
- Expect values: `desiredSleepDuration = 7.5`, `defaultWakeTime = 06:30`, `defaultSleepTime = 23:00`.
- In Firestore, a doc should exist at `users/{uid}` (may include `createdAt` and `lastUpdated`).

2) Save + reload round‑trip
- In Settings view, temporarily change a value (e.g., set `defaultWakeTime` to `07:00`).
- Save (if UI supports) or use a temporary console helper:
  - Open DevTools Console and run:
    - `firebase.firestore().doc('users/' + firebase.auth().currentUser.uid).set({ defaultWakeTime: '07:00' }, { merge: true })`
- Refresh the page and return to Settings.
- Expect to see `07:00` persisted.

3) No doc → defaults fallback
- In Firestore console, delete the `users/{uid}` doc for the test account.
- Refresh the app (still signed in).
- Expect default values again (7.5 / 06:30 / 23:00).

Notes
- The app initializes settings on first login. Defaults are stored server‑side on initialize and read client‑side for display.
- Multi‑tab sync is handled by BroadcastChannel; settings changes should reflect across tabs after save/refresh.
