# NASRDA Attendance — Mobile

React Native (Expo SDK 57, Expo Router) port of the NASRDA staff attendance web app.
Styling: **NativeWind v4** (Tailwind) using the same brand palette as the web app.
Data: TanStack Query + Axios against the existing `/api` backend, unchanged.

## Run it

```bash
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_URL if not using https://attendance.bots.ng
npx expo start              # Expo Go works for everything except biometric passkeys
```

Biometric check-in uses native passkeys (`react-native-passkey`), which need a **development build**:

```bash
npx expo prebuild
npx expo run:android   # or run:ios
```

## Structure

```
src/
  app/                      Expo Router routes (thin screens)
    _layout.tsx             Providers + auth gate (Stack.Protected)
    login.tsx               Sign in · MFA code · password reset
    (app)/
      _layout.tsx           Stack for pushed screens
      (tabs)/               Home · History · Requests · Admin (permission-gated) · Account
      device.tsx            Passkey registration, device removal, authenticator MFA
      password.tsx
      admin/                approvals, staff, departments, holidays, roles,
                            settings, reports, audit, geofence (map)
  components/
    ui/                     Design system: Button, Card, TextField, Select, DateField,
                            Sheet, Pill, Alert, ListRow, Segmented, …
    attendance/             ActionButton (check-in/out), ActivitySheet
    admin/                  Staff form / import sheets
  lib/                      api (CSRF + errors), auth, format (Lagos time), geo, passkey, files
  hooks/  types/  theme.ts  global.css
```

## Web → mobile mapping

| Web page | Mobile |
|---|---|
| Login (+MFA, reset) | `login.tsx` |
| Home / check-in / ActivitySheet | `(tabs)/index.tsx`, `ActivitySheet` |
| History | `(tabs)/history.tsx` (month stepper) |
| Requests (leave / official duty) | `(tabs)/requests.tsx` (bottom-sheet form) |
| DeviceSetup, Profile | `device.tsx`, `(tabs)/account.tsx`, `password.tsx` |
| Admin pages | `(tabs)/admin.tsx` hub + `admin/*` |

Mobile-specific touches: haptics, pull-to-refresh, native pickers, bottom sheets,
"Open in authenticator app" deep link, share sheet for reports, drag-to-edit map polygons,
Android mock-location refusal, refresh on app foreground.

## Things to know

- **Not yet run on a device.** It type-checks and bundles for Android and iOS; please smoke-test on hardware.
- **Passkeys:** `app.json` declares `webcredentials:attendance.bots.ng`. Passkeys only work once the
  domain publishes the matching `apple-app-site-association` / `assetlinks.json` for this app's bundle ID and
  signing key, and the server accepts the native origin. In Expo Go the UI explains this instead of crashing.
- **Session/CSRF:** the app keeps the Django session in the native cookie jar and echoes the `csrftoken`
  it reads from `Set-Cookie` (see `src/lib/api.ts`). If your server hides that header from clients, this is the
  one place to adapt.
- **Maps:** Android release builds need a Google Maps API key (`android.config.googleMaps.apiKey` in `app.json`).
- **Biometric check-in (Face ID / fingerprint):** every check-in and check-out asks the phone for Face ID
  (or Touch ID) on iPhone and fingerprint on Android, via `expo-local-authentication`, with no passcode option.
  A phone with no sensor, or nothing enrolled, is blocked with a message and an "Open phone settings" button.
  Account → "Face ID & fingerprint" has a **Test** button to confirm it works on a given phone.
  Android accepts strong biometrics only (fingerprint, 3D face). Face ID needs the installed development
  build; Expo Go cannot show it reliably.
- **This check runs on the phone.** The server cannot independently verify it, unlike a passkey. In Admin →
  System settings, "Require biometric passkey" must stay **off** while passkeys are dormant.
- **Passkeys are dormant.** The code is kept but disabled by `PASSKEY_ENABLED` in `src/lib/config.ts`.
  To turn it on later: set `EXPO_PUBLIC_PASSKEY_ENABLED=true` in `.env`, make a new build, and turn on
  "Require biometric passkey" in System settings.
- **Error messages (passkeys):** passkey failures show a plain-language reason plus a short technical code in brackets
  (e.g. `[BadConfiguration — ...]`). Send that bracketed text when reporting a problem.
- Light theme only, matching the web app.


https://github.com/Hollayemi/nasrda_attendance/tree/main
https://github.com/mzaraf/nasrda-attendance.git


i want you to watch on the branch, i want you to make the biometric not be testing, i want it to work on the pain for readiness. i want proper device setup registration and checkin when registered.

check the device setup to know what to do, check the web frontend to know the api used.

push to new branch