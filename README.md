# NASRDA Attendance — Mobile

React Native (Expo SDK 57, Expo Router) port of the NASRDA staff attendance web app.
Styling: **NativeWind v4** (Tailwind) using the same brand palette as the web app.
Data: TanStack Query + Axios against the existing `/api` backend, unchanged.

## Run it

```bash
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_URL if not using https://attendance.bots.ng
npx expo start              # the camera works in Expo Go; a development build is recommended for release testing
```

```bash
npx expo run:android   # or run:ios, to test a native build
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
      face.tsx              Face enrolment, phone registration, phone-removal request
      device.tsx            Authenticator MFA
      password.tsx
      admin/                approvals, staff, departments, holidays, roles,
                            settings, reports, audit, geofence (map)
  components/
    ui/                     Design system: Button, Card, TextField, Select, DateField,
                            Sheet, Pill, Alert, ListRow, Segmented, …
    attendance/             ActionButton (check-in/out), ActivitySheet
    face/                   FaceCapture (live 3-step camera capture)
    admin/                  Staff form / import sheets
  lib/                      api (CSRF + errors), auth, format (Lagos time), geo, device (device token), files
  hooks/  types/  theme.ts  global.css
```

## Web → mobile mapping

| Web page | Mobile |
|---|---|
| Login (+MFA, reset) | `login.tsx` |
| Home / check-in / ActivitySheet | `(tabs)/index.tsx`, `ActivitySheet` |
| History | `(tabs)/history.tsx` (month stepper) |
| Requests (leave / official duty) | `(tabs)/requests.tsx` (bottom-sheet form) |
| FaceSetup | `face.tsx` |
| DeviceSetup (MFA), Profile | `device.tsx`, `(tabs)/account.tsx`, `password.tsx` |
| Admin pages | `(tabs)/admin.tsx` hub + `admin/*` |

Mobile-specific touches: haptics, pull-to-refresh, native pickers, bottom sheets,
"Open in authenticator app" deep link, share sheet for reports, drag-to-edit map polygons,
Android mock-location refusal, refresh on app foreground.

## Things to know

- **Not yet run on a device.** It type-checks and bundles for Android and iOS; please smoke-test on hardware.
- **Session/CSRF:** the app keeps the Django session in the native cookie jar and echoes the `csrftoken`
  it reads from `Set-Cookie` (see `src/lib/api.ts`). If your server hides that header from clients, this is the
  one place to adapt.
- **Maps:** Android release builds need a Google Maps API key (`android.config.googleMaps.apiKey` in `app.json`).
- **Face verification (same as the web app):** attendance uses live camera face verification, not Face ID,
  fingerprint or passkeys.
  - *Set up* (Account → Face verification): three front-camera photos go to `POST /staff/face/enroll/` with a random
    device token (kept in the phone's secure storage) and the phone model as its label. This also binds the phone.
  - *Check in / out*: `POST /attendance/face/challenge/` returns three randomised steps, the three photos go to
    `POST /attendance/face/verify/`, and the one-use `verification_id` is sent with the check-in/out request together
    with the device token. The server does all the matching and liveness checks; the phone keeps no photos.
  - Removing a phone sends `POST /staff/devices/<id>/remove-request/` for administrator approval; admins can
    "Reset face" for a staff member (Admin → Staff).
  - Admin → System settings controls "Require face verification" and "Require an approved phone".
  - The camera permission is requested on first use; if refused, the screen explains how to turn it on.
- Light theme only, matching the web app.
