# Quickstart: Prepd MVP

**Branch**: `001-prepd-mvp` | **Date**: 2026-05-22

## Prerequisites

- Node.js (LTS)
- npm
- Expo CLI (`npx expo`)
- Supabase account (free tier)
- Spoonacular API key (free tier — 150 req/day)
- USDA FoodData Central API key (free)
- Google Cloud Console project (for Calendar OAuth)
- Apple Developer account (for Apple Sign-In)

## Setup

### 1. Clone and install

```bash
cd mealPlan
npm install
```

### 2. Install new dependencies

```bash
# PowerSync + SQLite
npx expo install @powersync/react-native @journeyapps/react-native-quick-sqlite
npm install @azure/core-asynciterator-polyfill
npm install --save-dev @babel/plugin-transform-async-generator-functions

# Supabase
npm install @supabase/supabase-js

# Redux Toolkit
npm install @reduxjs/toolkit react-redux

# Auth
npx expo install expo-auth-session expo-crypto expo-web-browser

# Calendar (native)
npx expo install expo-calendar

# Notifications
npx expo install expo-notifications expo-device

# Image handling
npx expo install expo-image

# Schema types
npm install schema-dts
```

### 3. Environment variables

Create `.env` at `mealPlan/` root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_POWERSYNC_URL=https://your-instance.powersync.com
EXPO_PUBLIC_SPOONACULAR_API_KEY=your-spoonacular-key
EXPO_PUBLIC_USDA_API_KEY=your-usda-key
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-google-ios-client-id
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-google-android-client-id
```

### 4. Supabase setup

1. Create a new Supabase project
2. Run the SQL migration from `data-model.md` to create tables
3. Enable Row Level Security (RLS) on all tables
4. Configure auth providers: Email, Google, Apple
5. Set up PowerSync integration in Supabase dashboard

### 5. Babel config

Update `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['@babel/plugin-transform-async-generator-functions'],
  };
};
```

### 6. Run

```bash
# Start dev server
npx expo start

# Platform-specific
npm run web       # Web
npm run ios       # iOS Simulator
npm run android   # Android Emulator
```

## Development Workflow

1. **Read the spec**: `specs/001-prepd-mvp/spec.md`
2. **Review the plan**: `specs/001-prepd-mvp/plan.md`
3. **Check the data model**: `specs/001-prepd-mvp/data-model.md`
4. **Follow service contracts**: `specs/001-prepd-mvp/contracts/service-contracts.md`
5. **Check constitution**: `.specify/memory/constitution.md` — all code must comply

## Key Directories

```
mealPlan/src/
├── app/          # Routes (Expo Router)
├── components/   # UI components by feature
├── store/        # Redux Toolkit slices
├── services/     # API + sync service wrappers
├── models/       # TypeScript types + PowerSync table defs
├── hooks/        # Custom React hooks
├── utils/        # Pure utility functions
└── constants/    # Theme, macros, dietary tags
```

## Testing

```bash
# Unit tests
npm test

# Run on specific platform
npm run web
npm run ios
npm run android
```

Test every feature on at least two platforms. Test offline behavior by enabling airplane mode.
