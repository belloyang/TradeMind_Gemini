<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hjSlRmrtZ9h6jdxyTwiYbJy8epL3_UHr

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Deployment
- Auth to Firebase: `firebase login`
- Set the project (creates .firebaserc):
cd to the root directory of TradeMind_Gemini
```
firebase use --add trade-mind-journal
```
(Select your project when prompted.)
- Ensure env vars exist for build: add your Firebase config to .env.local (or .env.production for CI) with the VITE_FIREBASE_* keys.
- Build the SPA (output goes to dist, already matched in firebase.json):
```
npm run build
```
- Deploy to hosting:
```
firebase deploy --only hosting
```
- Access URLs: https://trade-mind-journal.web.app and https://trade-mind-journal.firebaseapp.com (both point to the same hosting site).

## Mobile Release Path

This project now includes a Capacitor bridge so the existing React/Vite app can be shipped as native iOS and Android apps without rewriting the UI.

### What was added

- `capacitor.config.ts` defines the native app shell.
- `npm run mobile:add:ios` creates the Xcode project.
- `npm run mobile:add:android` creates the Android Studio project.
- `npm run mobile:sync` rebuilds the web app and copies it into the native shells.
- `npm run mobile:ios` rebuilds, syncs, and opens Xcode.
- `npm run mobile:android` rebuilds, syncs, and opens Android Studio.

### Prerequisites

- Node.js
- Xcode for iOS builds
- Android Studio for Android builds
- A valid Apple Developer account for App Store release
- A valid Google Play Console account for Play Store release

### First-time setup

1. Install dependencies:
   `npm install`
2. Ensure your `.env.local` contains the existing Firebase and Gemini environment variables.
3. Verify Firebase Auth has `localhost` in Authorized Domains. Capacitor serves the app from a local origin inside the native shell.
4. Create the native projects:
   `npm run mobile:add:ios`
   `npm run mobile:add:android`

### Daily mobile build flow

1. Build and sync the web app into both native projects:
   `npm run mobile:sync`
2. Open the iOS project:
   `npm run mobile:ios`
3. Open the Android project:
   `npm run mobile:android`

### iOS release checklist

1. Run `npm run mobile:ios`.
2. In Xcode, set your Team, Bundle Identifier, signing profile, app version, and build number.
3. Replace the default app icon and launch assets.
4. Test on a simulator and at least one physical iPhone.
5. Archive the app in Xcode and submit it through App Store Connect.

### Android release checklist

1. Run `npm run mobile:android`.
2. In Android Studio, set the application ID, version code, and version name.
3. Replace the default launcher icons and splash assets.
4. Create a signed release build or App Bundle.
5. Upload the `.aab` to Google Play Console.

### Notes specific to this app

- Email/password Firebase Auth should work inside Capacitor with the current setup.
- Stripe checkout is still browser-based. If you later want in-app purchases or native payment flows, that should be implemented separately because App Store and Play Store rules are stricter than the web.
- Analytics and other browser-only integrations should be validated on device before release.