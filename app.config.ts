import type { ConfigContext, ExpoConfig } from "expo/config";

// APP_VARIANT=fork builds the app from another Expo account/project
// (see the `testflight` profile in eas.json). Without it, app.json is
// used unchanged.
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (process.env.APP_VARIANT !== "fork") return base;

  const projectId = process.env.EAS_PROJECT_ID;

  return {
    ...base,
    owner: process.env.EXPO_OWNER ?? base.owner,
    slug: process.env.EXPO_SLUG ?? base.slug,
    ios: {
      ...base.ios,
      bundleIdentifier: process.env.IOS_BUNDLE_ID ?? base.ios?.bundleIdentifier,
    },
    extra: {
      ...base.extra,
      eas: { ...base.extra?.eas, projectId: projectId ?? base.extra?.eas?.projectId },
    },
    updates: projectId
      ? { ...base.updates, url: `https://u.expo.dev/${projectId}` }
      : base.updates,
  };
};
