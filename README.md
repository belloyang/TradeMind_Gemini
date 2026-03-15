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
3. Create `.env.local` (or use `.env.example`) with your Firebase project config:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Run the app:
   `npm run dev`

## Deployment
- Auth to Firebase: firebase login
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