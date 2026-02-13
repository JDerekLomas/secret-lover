# secret-lover

Keep secrets out of AI reach. Touch ID-protected macOS Keychain CLI for developers.

```bash
curl -sL https://secret-lover.dev/install.sh | bash
```

## The Problem

AI coding assistants can read your `.env` files. Your API keys end up in conversation logs, training data, who knows where.

## The Solution

Store secrets in macOS Keychain. Create a `.secrets.json` manifest that tells AI what you *need* without exposing *values*.

```json
{
  "project": "my-app",
  "secrets": [
    "STRIPE_SECRET_KEY",
    "DATABASE_URL"
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

- `secrets` — names of keys stored in macOS Keychain (fetched via Touch ID)
- `env` — static values injected directly (no Keychain lookup)

AI sees the manifest, suggests: `secret-lover run -- npm run dev`

You approve with Touch ID. Secrets injected for that command only.

## Quick Start

```bash
# Add a secret (Touch ID protected)
secret-lover add OPENAI_API_KEY "sk-..."

# Run with secrets injected
secret-lover run -- npm run dev

# List your secrets
secret-lover list

# Migrate existing secrets to Touch ID
secret-lover migrate
```

## Features

- **Touch ID** - Every secret access requires your fingerprint
- **Per-project namespacing** - Same env var name, different values per project
- **AI-safe manifests** - `.secrets.json` describes secrets without exposing them
- **Zero dependencies** - Bash script + Swift helper, uses native macOS Keychain
- **Fully auditable** - ~200 lines of code, read it in 5 minutes

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  .secrets.json  │────▶│  secret-lover    │────▶│  Keychain   │
│  (AI can see)   │     │  (Touch ID gate) │     │  (encrypted)│
└─────────────────┘     └──────────────────┘     └─────────────┘
        │                        │
        ▼                        ▼
   AI suggests:            You approve:
   "Run secret-lover       [Touch ID prompt]
    run -- npm dev"
```

## Commands

| Command | Description |
|---------|-------------|
| `secret-lover add NAME [VALUE]` | Store a secret (prompts if no value) |
| `secret-lover get NAME` | Retrieve a secret (Touch ID) |
| `secret-lover run -- CMD` | Run command with secrets from `.secrets.json` |
| `secret-lover list` | List secrets for current project |
| `secret-lover list --all` | List all secrets across projects |
| `secret-lover verify` | Check if project has all needed secrets |
| `secret-lover migrate` | Migrate existing secrets to Touch ID |

## Per-Project Secrets

```bash
# In ~/project-a
secret-lover add DATABASE_URL "postgres://prod..."

# In ~/project-b
secret-lover add DATABASE_URL "postgres://staging..."

# Each project gets its own DATABASE_URL
# Global secrets (--global) are shared across all projects
```

## vs Other Tools

| | secret-lover | cross-keychain | Doppler | 1Password CLI |
|---|---|---|---|---|
| Touch ID | Yes | No | No | Yes |
| Local only | Yes | Yes | No (cloud) | No (cloud) |
| AI-focused | Yes | No | No | No |
| Free | Yes | Yes | Freemium | Paid |
| Dependencies | None | Node.js | Account | Account |

## Requirements

- macOS (uses Keychain + Touch ID)
- Touch ID or password fallback

## License

MIT
