# BadgeDeck

BadgeDeck is an offline-first Expo app for healthcare professionals to store and quickly view digital copies of badge reference cards.

The current build includes:

- A tactile 3D badge reel home screen
- Local SQLite metadata storage
- Local app document storage for imported images
- Camera/photo-library import for front and optional back card images
- Display/thumbnail image generation
- Full-screen viewer with pinch, pan, double-tap zoom, front/back switching, favorites, archive, and high-contrast mode

## Requirements

- Expo SDK 56
- Node.js `22.13.x` or newer in the SDK-supported range
- A development build for native testing; Expo Go is not the right runtime for this app because it uses native modules and config plugins.

Project rule: check the versioned Expo docs at <https://docs.expo.dev/versions/v56.0.0/> before changing Expo APIs or config.

## Setup

```bash
npm install
```

## Run locally

For web/static validation:

```bash
npx expo start --web
```

For Android/iOS native testing, build and run a development client:

```bash
npx eas build --profile development --platform android
npx expo start --dev-client
```

## Useful checks

```bash
npx tsc --noEmit
npx expo export --platform web
npx expo install --check
```

## Notes

- MVP is local-only and does not claim HIPAA compliance.
- Avoid storing PHI or patient identifiers in badge images or notes.
- Imported card files are app user data and are stored under the app document directory.
