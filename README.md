# secret-lover

Keep secrets out of AI transcripts. A macOS Keychain CLI for developers who work with coding agents.

```bash
curl -sL https://secret-lover.dev/install.sh | bash
```

## The problem

AI coding agents need your API keys to do their job. They do not need to *see* them. Every value that
passes through a chat ends up in a plaintext transcript on disk, in shell history, in logs, and often in
a cloud session. A later audit of one developer's transcripts found 21 complete Gemini keys and a dozen
live database URIs. Rotation after the fact is painful. Not leaking in the first place is cheap.

## The solution

Store secrets in the macOS Keychain, namespaced per project. Tell the agent the **name**, never the value.
The agent injects the value into one command at the moment of use. If something leaks anyway, `scrub`
finds it and redacts it in place.

```bash
secret-lover add STRIPE_SECRET_KEY "sk_live_..." --global     # you, once
# in chat: "it's in secret-lover as STRIPE_SECRET_KEY"
secret-lover run --secret STRIPE_SECRET_KEY -- npm run dev     # the agent, every time
secret-lover scrub                                             # find values that leaked into transcripts
```

A `.secrets.json` manifest lets a project declare what it needs, so the agent can read the manifest and
never has to ask:

```json
{
  "project": "my-app",
  "secrets": ["STRIPE_SECRET_KEY", "DATABASE_URL"],
  "env": { "NODE_ENV": "production" }
}
```

- `secrets` — names of Keychain items (project namespace first, then global)
- `env` — static values injected directly

## Commands

| Command | Description |
|---|---|
| `secret-lover add NAME [VALUE] [--global]` | Store a secret (prompts if no value) |
| `secret-lover get NAME` | Print a secret (Touch ID when printing to a terminal) |
| `secret-lover run -- CMD` | Run CMD with the manifest's secrets injected |
| `secret-lover run --project P --secret K -- CMD` | Inject named secrets, no manifest needed |
| `secret-lover run --project P --all -- CMD` | Inject every secret in P plus every global one |
| `secret-lover import FILE.env [--project P]` | Pull a dotenv file into the Keychain (then delete the file) |
| `secret-lover list [--all]` | List names for this project, or everything |
| `secret-lover verify` | Check the manifest's secrets all exist |
| `secret-lover scrub [--fix] [PATHS]` | Find secret values in transcripts, history and logs; `--fix` redacts |
| `secret-lover delete NAME` | Remove a secret |

`SECRET_LOVER_PROJECT=name` or `--project name` overrides the namespace; `global` means no namespace.
A missing secret tells you which other namespaces hold that name instead of failing silently.

## Prompts

`SECRET_LOVER_PROMPT` controls Touch ID:

- `auto` (default): prompt only when `get` is about to print a value on a terminal. `run` injects
  silently, so agents, cron jobs and launchd agents never block on a fingerprint.
- `always`: prompt on every retrieval, cached for 60 seconds.
- `never`: no prompts.

## What this is, honestly

- Per-project namespacing in the login Keychain.
- Injection into one process, so values stay out of transcripts and shell history.
- An audit log of names (never values) at `~/.secret-lover/access.log`, rotated at 5 MB.
- A scrubber for the values that leaked anyway.

It is **not** an access boundary. Any process running as your user can read the login Keychain, with
`security find-generic-password` or otherwise, and no prompt will stop it. Touch ID here is a
confirmation step before a value is displayed, not a lock. If you need a boundary between an agent and
your credentials, run the agent as a different user or in a container. This tool is hygiene, and hygiene
is where nearly all real leaks happen.

## Requirements

macOS. Bash script plus a small Swift helper. No dependencies, no server, no account.

## License

MIT
