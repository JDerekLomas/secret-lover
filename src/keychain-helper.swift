#!/usr/bin/env swift
//
// keychain-helper - Touch ID enabled keychain access
// Uses LocalAuthentication for Touch ID, then accesses keychain
//

import Foundation
import Security
import LocalAuthentication

let serviceName = "secret-lover"

func getService(project: String?) -> String {
    if let proj = project, !proj.isEmpty {
        return "\(serviceName)/\(proj)"
    }
    return serviceName
}

func authenticate(reason: String, completion: @escaping (Bool) -> Void) {
    let context = LAContext()
    context.localizedFallbackTitle = "Use Password"

    var error: NSError?
    if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) {
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            completion(success)
        }
    } else {
        // No biometrics available, fall through
        completion(true)
    }
}

func addSecret(name: String, value: String, project: String?) -> Bool {
    let service = getService(project: project)

    // Delete existing first
    let deleteQuery: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecAttrAccount as String: name
    ]
    SecItemDelete(deleteQuery as CFDictionary)

    // Add to keychain
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecAttrAccount as String: name,
        kSecValueData as String: value.data(using: .utf8)!,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked
    ]

    let status = SecItemAdd(query as CFDictionary, nil)
    if status == errSecSuccess {
        return true
    } else {
        fputs("Error adding secret: \(SecCopyErrorMessageString(status, nil) ?? "unknown" as CFString)\n", stderr)
        return false
    }
}

func getSecret(name: String, project: String?) -> String? {
    let service = getService(project: project)

    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecAttrAccount as String: name,
        kSecReturnData as String: true
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    if status == errSecSuccess, let data = result as? Data {
        return String(data: data, encoding: .utf8)
    }

    // Try global fallback if project-specific not found
    if project != nil && status == errSecItemNotFound {
        return getSecret(name: name, project: nil)
    }

    return nil
}

func deleteSecret(name: String, project: String?) -> Bool {
    let service = getService(project: project)

    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecAttrAccount as String: name
    ]

    let status = SecItemDelete(query as CFDictionary)

    // Try global if project-specific not found
    if project != nil && status == errSecItemNotFound {
        return deleteSecret(name: name, project: nil)
    }

    return status == errSecSuccess || status == errSecItemNotFound
}

func listSecrets(service: String) -> [String] {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecReturnAttributes as String: true,
        kSecMatchLimit as String: kSecMatchLimitAll
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    if status == errSecSuccess, let items = result as? [[String: Any]] {
        return items.compactMap { $0[kSecAttrAccount as String] as? String }
    }
    return []
}

func listAllSecrets() -> [(String, String)] {  // (name, service)
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecReturnAttributes as String: true,
        kSecMatchLimit as String: kSecMatchLimitAll
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    var secrets: [(String, String)] = []
    if status == errSecSuccess, let items = result as? [[String: Any]] {
        for item in items {
            if let service = item[kSecAttrService as String] as? String,
               let account = item[kSecAttrAccount as String] as? String,
               service.hasPrefix(serviceName) {
                secrets.append((account, service))
            }
        }
    }
    return secrets
}

// Main
let args = CommandLine.arguments

if args.count < 2 {
    print("Usage: keychain-helper <command> [args...]")
    print("Commands: add, get, get-auth, delete, list, list-all")
    exit(1)
}

let command = args[1]

switch command {
case "add":
    if args.count < 4 {
        fputs("Usage: keychain-helper add <name> <value> [project]\n", stderr)
        exit(1)
    }
    let name = args[2]
    let value = args[3]
    let project = args.count > 4 ? args[4] : nil

    if addSecret(name: name, value: value, project: project) {
        print("OK")
    } else {
        exit(1)
    }

case "get":
    // Get without auth prompt (for migration/listing)
    if args.count < 3 {
        fputs("Usage: keychain-helper get <name> [project]\n", stderr)
        exit(1)
    }
    let name = args[2]
    let project = args.count > 3 ? args[3] : nil

    if let value = getSecret(name: name, project: project) {
        print(value)
    } else {
        fputs("Secret not found: \(name)\n", stderr)
        exit(1)
    }

case "get-auth":
    // Get with Touch ID prompt first
    if args.count < 3 {
        fputs("Usage: keychain-helper get-auth <name> [project]\n", stderr)
        exit(1)
    }
    let name = args[2]
    let project = args.count > 3 ? args[3] : nil

    let semaphore = DispatchSemaphore(value: 0)
    var authSuccess = false

    authenticate(reason: "Access secret: \(name)") { success in
        authSuccess = success
        semaphore.signal()
    }

    semaphore.wait()

    if !authSuccess {
        fputs("Authentication failed\n", stderr)
        exit(1)
    }

    if let value = getSecret(name: name, project: project) {
        print(value)
    } else {
        fputs("Secret not found: \(name)\n", stderr)
        exit(1)
    }

case "delete":
    if args.count < 3 {
        fputs("Usage: keychain-helper delete <name> [project]\n", stderr)
        exit(1)
    }
    let name = args[2]
    let project = args.count > 3 ? args[3] : nil

    if deleteSecret(name: name, project: project) {
        print("OK")
    } else {
        fputs("Failed to delete: \(name)\n", stderr)
        exit(1)
    }

case "list":
    let project = args.count > 2 ? args[2] : nil
    let service = getService(project: project)
    let secrets = listSecrets(service: service)
    for secret in secrets {
        print(secret)
    }

case "list-all":
    let secrets = listAllSecrets()
    for (name, service) in secrets.sorted(by: { $0.0 < $1.0 }) {
        if service == serviceName {
            print("\(name)\tglobal")
        } else {
            let project = String(service.dropFirst(serviceName.count + 1))
            print("\(name)\t\(project)")
        }
    }

default:
    fputs("Unknown command: \(command)\n", stderr)
    exit(1)
}
