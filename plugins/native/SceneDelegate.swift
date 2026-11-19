import UIKit

// iOS 27 terminates apps built with the iOS 27 SDK that don't adopt the
// UIScene lifecycle. AppDelegate still creates the window and starts React
// Native (expo-dev-launcher needs it during launch); this attaches it to the
// scene and forwards links that scenes receive instead of AppDelegate.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let window = UIApplication.shared.delegate?.window ?? nil else { return }
    window.windowScene = windowScene
    window.makeKeyAndVisible()
    self.window = window

    self.scene(scene, openURLContexts: connectionOptions.urlContexts)
    connectionOptions.userActivities.forEach { self.scene(scene, continue: $0) }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = UIApplication.shared.delegate?.application?(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
