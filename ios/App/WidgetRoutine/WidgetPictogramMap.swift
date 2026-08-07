import Foundation

enum WidgetPictogramMap {
  private static let emoji: [String: String] = [
    "brush_teeth": "🪥",
    "wash_hands": "🧼",
    "breakfast": "🥣",
    "dress": "👕",
    "school": "🏫",
    "shower": "🚿",
    "dinner": "🍽️",
    "sleep": "😴",
  ]

  static func emoji(for key: String?) -> String {
    guard let key = key, let e = emoji[key] else { return "⭐" }
    return e
  }
}
