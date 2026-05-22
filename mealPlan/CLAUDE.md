@AGENTS.md

# Project: Meal Planning App

## Overview

Cross-platform meal planning app targeting iOS, Android, and Web. Currently in boilerplate/scaffolding phase.

## Tech

- Expo SDK 56 / React Native 0.85 / TypeScript 6
- Expo Router for file-based routing (typed routes enabled)
- `react-native-web` for web support
- React Compiler experiment enabled

## Key Commands

- `npm install` — install deps
- `npx expo start` — start dev server
- `npm run web` — start for web
- `npm run android` — start for Android
- `npm run ios` — start for iOS
- `npx expo lint` — lint (needs ESLint setup first)

## Conventions

- Source code lives in `src/` — routes in `src/app/`, components in `src/components/`, hooks in `src/hooks/`
- Platform-specific files use `.web.ts` / `.web.tsx` suffix
- Global styles in `src/global.css`
- Theme constants in `src/constants/theme.ts`
