# PayDrop Mobile

**PayDrop** is a modern, state-of-the-art fintech mobile application designed to simplify peer-to-peer money transfers. Built with a focus on trust and user experience, PayDrop prioritizes intuitive interactions and a premium aesthetic.

*"Trust the Person. Not the Number."*

## 🚀 Key Features

- **Immersive Onboarding**: A high-end, multi-stage onboarding flow designed to wow users from the first launch.
- **Secure Authentication**: Robust phone number verification with a 6-digit OTP system.
- **Modern Fintech Dashboard**: A comprehensive home screen featuring real-time balance tracking, quick actions, and detailed transaction history.
- **Seamless UX**: Smooth transitions and micro-animations powered by React Native Reanimated.
- **Custom Design System**: Utilizing **Satoshi** typography and a tailored color palette for a premium brand feel.

## 🛠 Tech Stack

- **Framework**: [Expo](https://expo.dev/) / [React Native](https://reactnative.dev/)
- **Styling**: [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (with Persistence)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Icons**: [Ionicons](https://ionicons.com/) via Expo Vector Icons

## 📁 Project Structure

```text
app/
├── (auth)/         # Authentication flow (Onboarding, Phone, OTP, Display Name)
├── (tabs)/         # Main application tabs (Home, Transfer, Cards, Profile)
├── _layout.tsx     # Root layout with conditional routing
└── index.tsx       # Smart splash screen & entry point
components/
└── shared/         # Reusable design system components
config/
├── colors.ts       # Global brand color palette
└── fonts.ts        # Typography configuration
store/
├── appState.ts     # Persistent app-level state (onboarding status)
└── userStore.ts    # User authentication & profile state
```

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.19 or later; automated checks were run with Node 24)
- A custom Expo development build on a physical iPhone or Android device for BLE (Expo Go does not support this feature)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/victorfaruna/paydrop-mobile.git
   cd paydrop-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the App

Start the development server with a clean cache:

```bash
npx expo start -c
```

Open a custom development build with `npx expo start --dev-client`. BLE testing requires physical devices and a fresh native binary; use the `development-device` EAS profile for hardware builds.

## 🎨 Design Principles

- **No Unnecessary Shadows**: Utilizing flat design with thin borders and color variations for depth.
- **Premium Typography**: **Satoshi** is the default for app text and inputs. Use `Text` and `TextInput` from `@/components/shared`; choose `font-satoshi-medium` or `font-satoshi-bold` when a different weight is needed.
- **Responsive Layouts**: Flexible designs that adapt across various screen sizes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## BLE social transfers

See [the architecture and staging contract guide](docs/ble-transfer-architecture.md) for lifecycle ownership, payment recovery, secure credential migration, public configuration and the device validation matrix. New financial submissions stay disabled until `EXPO_PUBLIC_TRANSFER_CONTRACT_CONFIRMED=true` is explicitly configured after staging validation.

## 🚀 CI/CD (iOS)

- **CI** (`.github/workflows/ci.yml`) runs on every PR and push to `main`: lint, typecheck, tests, `expo-doctor`, `expo install --check`, a JS bundle export and an iOS `prebuild` to catch config-plugin errors before spending EAS build credits.
- **Release iOS** (`.github/workflows/release-ios.yml`) runs those checks, then builds with the `testflight` EAS profile and submits to TestFlight.

The `testflight` profile sets `APP_VARIANT=fork`, which makes `app.config.ts` swap in a separate Expo project, owner and bundle ID. Builds with the other profiles use `app.json` unchanged.

To release:

1. Bump `expo.version` in `app.json` (e.g. `1.2.1`) and merge to `main`.
2. `git tag v1.2.1 && git push origin v1.2.1` (or run **Release iOS** from the Actions tab).

The tag must match `app.json`. EAS auto-increments the build number.

One-time setup: fill in the `REPLACE_WITH_*` values in `eas.json` (`testflight` build and submit profiles), add an `EXPO_TOKEN` repository secret, and store iOS signing credentials plus an App Store Connect API key in EAS (`eas credentials -p ios`).
