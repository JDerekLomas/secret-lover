# Secret Lover

**Keep secrets out of AI transcripts.** macOS Keychain CLI, per-project namespacing, one-command injection, and a scrubber.

## Status: Working (rev. 2026-09-12)

`/usr/local/bin/secret-lover` is a symlink to `bin/secret-lover` here; the Swift helper lives beside it in `bin/`.
Rebuild the helper with `swiftc -O src/keychain-helper.swift -o bin/keychain-helper && codesign -s - --entitlements src/entitlements.plist bin/keychain-helper`.

## How an agent should use it

- Never ask for or print a value. Check presence with `sh -c 'echo ${#NAME}'` inside `run`.
- Inject at point of use: `secret-lover run --project P --secret NAME -- <cmd>` (no manifest needed),
  or `secret-lover run -- <cmd>` where a `.secrets.json` exists.
- If told "it's in secret-lover as NAME", use `--global` scope unless a project is named.
- `run` never prompts (policy `auto`). `get` prompts only on a terminal.
- A "not found" message lists the namespaces that do hold the name. Use `--project` accordingly.
- `secret-lover scrub` scans `~/.claude`, `~/.claude-archive`, shell history and the access log for
  known secret values. `--fix` redacts in place. Do not `--fix` before credentials have been rotated:
  the transcripts are the evidence of what needs rotating.

## Commands

```bash
secret-lover add NAME [VALUE] [--global]
secret-lover get NAME
secret-lover run [--project P] [--secret K]... [--all] [--timeout S] -- <cmd>
secret-lover import FILE.env [--project P | --global]
secret-lover list [--all]      secret-lover verify      secret-lover delete NAME
secret-lover scrub [--fix] [--min-length N] [--skip REGEX] [PATHS...]
```

## Security, stated plainly

Items are ordinary login-Keychain items with no access control. Any process running as the user can read
them without a prompt; Touch ID is a confirmation step in front of an unprotected read, and the 60 s
auth cache is a plain timestamp file. The value of the tool is hygiene (values never enter chat, history
or logs) plus namespacing and an audit trail. It is not a boundary.

## Key files
- `bin/secret-lover` — CLI
- `src/keychain-helper.swift` — Touch ID + Keychain helper (`add`, `get`, `get-auth`, `delete`, `list`, `list-all`)
- `index.html` — landing page (secret-lover.dev, Vercel)
