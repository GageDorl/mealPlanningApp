# Meal Planning App

A cross-platform meal planning application built with [Expo](https://expo.dev) (SDK 56) and [React Native](https://reactnative.dev). Targets **iOS**, **Android**, and **Web**.

## Status

**Boilerplate phase** — scaffolded with `create-expo-app` and configured for web support via `react-native-web`. Feature planning and specification are next.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 56 / React Native 0.85 |
| Language | TypeScript 6 |
| Routing | Expo Router (file-based, typed routes) |
| Web | `react-native-web`, `react-dom`, `@expo/metro-runtime` |
| Animations | `react-native-reanimated` |
| Gestures | `react-native-gesture-handler` |

## Project Structure

```
mealPlan/
├── src/
│   ├── app/          # File-based routes (Expo Router)
│   ├── components/   # Shared UI components
│   ├── constants/    # Theme and config values
│   └── hooks/        # Custom React hooks
├── assets/           # Images, icons, splash screen
├── scripts/          # Utility scripts (e.g. reset-project)
├── app.json          # Expo config
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node.js)

### Install & Run

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start
```

From the dev server you can open the app on:

- **Web** — press `w` or run `npm run web`
- **Android emulator** — press `a` or run `npm run android`
- **iOS simulator** (macOS only) — press `i` or run `npm run ios`
- **Expo Go** — scan the QR code with the Expo Go app on a physical device

### Reset to a Blank Project

```bash
npm run reset-project
```

Moves starter code to `app-example/` and creates a fresh `app/` directory.

## Next Steps

- Run a planning/specification session (e.g. grill-me, speckit) to define features and user flows with the team.
- Set up ESLint: `npx expo lint` — see [Using ESLint and Prettier](https://docs.expo.dev/guides/using-eslint/)
- Set up testing: see [Unit Testing with Jest](https://docs.expo.dev/develop/unit-testing/)

## Resources

- [Expo Docs (v56)](https://docs.expo.dev/versions/v56.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction)
- [React Native Web](https://necolas.github.io/react-native-web/)

## License

See [LICENSE](./LICENSE).
