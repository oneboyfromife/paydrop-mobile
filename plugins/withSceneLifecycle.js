const {
  IOSConfig,
  withInfoPlist,
  withXcodeProject,
  createRunOncePlugin,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// iOS 27 kills apps built with the iOS 27 SDK that still use the
// AppDelegate-only lifecycle. Remove once the Expo SDK template adopts UIScene.
function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });
  return withXcodeProject(config, (cfg) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(
      cfg.modRequest.projectRoot,
    );
    const filepath = `${projectName}/SceneDelegate.swift`;
    fs.copyFileSync(
      path.join(__dirname, "native/SceneDelegate.swift"),
      path.join(cfg.modRequest.platformProjectRoot, filepath),
    );
    if (!cfg.modResults.hasFile(filepath))
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: cfg.modResults,
      });
    return cfg;
  });
}

module.exports = createRunOncePlugin(
  withSceneLifecycle,
  "with-scene-lifecycle",
  "1.0.0",
);
