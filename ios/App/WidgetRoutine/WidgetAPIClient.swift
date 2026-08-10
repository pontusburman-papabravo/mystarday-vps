import Foundation

enum WidgetAPIConfig {
    static func baseUrl() -> String {
        if let shared = WidgetBridgeStore.apiBaseUrl(), !shared.isEmpty, !shared.contains("WIDGET_API") {
            return shared.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }
        if let plist = Bundle.main.object(forInfoDictionaryKey: "WidgetAPIBaseURL") as? String,
           !plist.isEmpty, !plist.contains("WIDGET_API") {
            return plist.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }
        return ""
    }

    static func childTodayURL() -> URL? {
        let base = baseUrl()
        guard !base.isEmpty else { return nil }
        return URL(string: base + "/child/today")
    }

    static func parentHomeURL() -> URL? {
        let base = baseUrl()
        guard !base.isEmpty else { return nil }
        return URL(string: base + "/dashboard")
    }

    /// Parent must reconnect widget binding — not child PIN flow.
    static func widgetReconnectSettingsURL() -> URL? {
        let base = baseUrl()
        guard !base.isEmpty else { return nil }
        return URL(string: base + "/settings?from_widget=1#widgetSettingsSection")
    }

    static func openURL(for entry: NextRoutineEntry) -> URL? {
        switch entry.phase {
        case .reauth, .revoked, .offline:
            return widgetReconnectSettingsURL() ?? parentHomeURL()
        default:
            return parentHomeURL() ?? childTodayURL()
        }
    }
}

final class WidgetAPIClient {
    static let shared = WidgetAPIClient()
    private let session: URLSession
    private let timeout: TimeInterval = 12

    private init() {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = timeout
        config.timeoutIntervalForResource = timeout
        session = URLSession(configuration: config)
    }

    func fetchNextAction(completion: @escaping (Result<[String: Any], WidgetAPIError>) -> Void) {
        request(path: "/api/widget/next-action", method: "GET", body: nil, completion: completion)
    }

    func fetchContext(completion: @escaping (Result<[String: Any], WidgetAPIError>) -> Void) {
        request(path: "/api/widget/context", method: "GET", body: nil, completion: completion)
    }

    func switchChild(
        targetChildId: String,
        completion: @escaping (Result<[String: Any], WidgetAPIError>) -> Void
    ) {
        let body: [String: Any] = ["child_id": targetChildId]
        request(path: "/api/widget/switch-child", method: "POST", body: body, completion: completion)
    }

    func completeAction(
        instanceToken: String,
        idempotencyKey: String,
        completion: @escaping (Result<[String: Any], WidgetAPIError>) -> Void
    ) {
        let body: [String: Any] = [
            "instance_token": instanceToken,
            "idempotency_key": idempotencyKey,
        ]
        request(path: "/api/widget/complete-action", method: "POST", body: body, completion: completion)
    }

    func rebindInstallation(
        installationId: String,
        childId: String,
        completion: @escaping (Result<[String: Any], WidgetAPIError>) -> Void
    ) {
        let body: [String: Any] = [
            "installation_id": installationId,
            "child_id": childId,
        ]
        request(path: "/api/widget/rebind-installation", method: "POST", body: body, completion: completion)
    }

    private func request(
        path: String,
        method: String,
        body: [String: Any]?,
        completion: @escaping (Result<[String: Any], WidgetAPIError>) -> Void
    ) {
        guard WidgetBridgeStore.hasBinding(installationId: activeInstallationId()),
              let token = WidgetBridgeStore.bindingToken(installationId: activeInstallationId()) else {
            completion(.failure(.reauth))
            return
        }
        let base = WidgetAPIConfig.baseUrl()
        guard !base.isEmpty, let url = URL(string: base + path) else {
            completion(.failure(.offline))
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body = body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        let task = session.dataTask(with: req) { data, response, error in
            if error != nil {
                completion(.failure(.offline))
                return
            }
            let http = response as? HTTPURLResponse
            let code = http?.statusCode ?? 0
            let json = (data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }) ?? [:]
            if code == 401 {
                completion(.failure(.reauth))
                return
            }
            if code == 403 {
                let status = json["status"] as? String ?? ""
                if status == "device_revoked" {
                    completion(.failure(.revoked))
                } else {
                    completion(.failure(.reauth))
                }
                return
            }
            if code == 409, let next = json["next"] as? [String: Any] {
                completion(.success(next))
                return
            }
            guard (200...299).contains(code) else {
                completion(.failure(.offline))
                return
            }
            completion(.success(json))
        }
        task.resume()
    }

    private func activeInstallationId() -> String? {
        WidgetBridgeStore.timelineScope ?? WidgetBridgeStore.installationId(forScope: nil)
    }
}

enum WidgetAPIError: Error {
    case offline
    case reauth
    case revoked
}
