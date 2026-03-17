<p align="center">
  <strong>⛩ B U S H I D O &nbsp; O S ⛩</strong><br>
  <em>The Enforcement Layer Between Intent and Execution</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/bushido-os"><img src="https://img.shields.io/npm/v/bushido-os?color=e63946&label=npm" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node"></a>
</p>

---

**BushidoOS** is an AI Product Manager that lives in your terminal. It generates living product specs, audits your codebase for alignment, cascades requirement changes, and keeps every coding agent (Cursor, Copilot, Claude, OpenClaw) on track.

```bash
npx bushido-os kickstart "AI savings app for Gen-Z"
```

## Why?

AI writes code faster than ever. But **faster code that drifts from the spec is faster waste.**

- PM writes a spec in Notion → developer builds with Cursor → spec goes stale → code drifts → nobody notices
- 3 developers prompt 3 different agents → 3 divergent interpretations of the same feature
- Client says "add this" → team builds it → client says "that's not what I meant"

**BushidoOS breaks this cycle.** Your spec is a machine-readable artifact that audits the code in real-time.

## Quick Start

```bash
# 1. Create a .env.local with your API key
echo "VITE_GEMINI_API_KEY=your_key_here" > .env.local

# 2. Generate a full product spec from an idea
npx bushido-os kickstart "AI savings app for Gen-Z"

# 3. Check project status
npx bushido-os status

# 4. Audit your codebase against the spec
npx bushido-os audit

# 5. Push a requirement change
npx bushido-os change "Add social savings feature"
```

## Commands

| Command | Description |
|---------|-------------|
| `bushido status` | Project dashboard — spec health, audit scores, artifact inventory |
| `bushido kickstart <idea>` | Full pipeline: Research → Strategy → Adversarial Roast → Spec Bundle |
| `bushido audit` | Foreman alignment audit — scores codebase (0-100) against the spec |
| `bushido diff` | Show current spec features and constraints |
| `bushido change <desc>` | AI impact analysis → cascade → version bump → .cursorrules update |
| `bushido history` | Spec version timeline with change log |
| `bushido roast` | Re-run adversarial strategy review from existing analysis |
| `bushido chat` | Interactive REPL with your AI PM (context-aware) |
| `bushido push` | Upload `.bushido/` artifacts to Supabase cloud |
| `bushido pull` | Download `.bushido/` with conflict detection |
| `bushido serve` | Start MCP server for IDE integration |

## How It Works

```
You (Founder/PM)
   │
   ├── bushido kickstart "idea"     → generates spec.json, strategy.md, .cursorrules
   ├── bushido change "add X"       → AI impact analysis → cascade → version bump
   │
   ▼
Coding Agent (Cursor, Copilot, Claude)
   │
   ├── Reads .cursorrules           → knows what to build (and what NOT to build)
   ├── Reads spec.json              → acceptance criteria for each feature
   │
   ▼
bushido audit
   │
   ├── Score: 100/100               → ✅ Fully aligned
   └── Score: 72/100                → ❌ Punchlist of violations with severity
```

## The `.bushido/` Directory

BushidoOS creates a `.bushido/` folder in your project root — the single source of truth:

```
.bushido/
├── spec.json              # Living PRD (features, constraints, acceptance criteria)
├── strategy.md            # Market analysis and strategic direction
├── .cursorrules           # Auto-generated IDE rules (synced to project root)
├── alignment-report.json  # Latest audit score and analysis
├── punchlist.json         # Outstanding spec violations
├── changes.json           # Change log with impact analysis
├── history/               # Versioned spec snapshots
├── conversations/         # Chat history persistence
└── .sync-manifest.json    # Cloud sync state
```

## MCP Server (IDE Integration)

BushidoOS exposes **12 tools** via the [Model Context Protocol](https://modelcontextprotocol.io/) so coding agents can interact programmatically:

```bash
bushido serve   # Starts the MCP server on stdio
```

**Key tools:**
- `get_project_context` — everything an agent needs in one call
- `get_spec` / `get_feature` / `get_constraints` — granular spec access
- `run_audit` — trigger alignment audit from the IDE
- `push_change` — propose requirement changes
- `report_progress` — log what was implemented

IDE configs are auto-generated for **Cursor**, **VS Code**, **Windsurf**, and **Claude Desktop**.

## Configuration

Copy `.env.example` to `.env.local` and add your keys:

```bash
cp .env.example .env.local
```

| Key | Required | Purpose |
|-----|----------|---------|
| `VITE_GEMINI_API_KEY` | ✅ | AI calls (spec generation, audit, chat) |
| `VITE_TAVILY_API_KEY` | Optional | Deep market research in `kickstart` |
| `VITE_SUPABASE_URL` | Optional | Cloud sync (`push`/`pull`) |
| `VITE_SUPABASE_ANON_KEY` | Optional | Cloud sync auth |

Get a Gemini key free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Where BushidoOS Fits

```
┌───────────────────────────────────────┐
│  Project Management    (Linear, Jira) │  ← tracks what to build
├───────────────────────────────────────┤
│  Spec Orchestration    (BushidoOS)    │  ← enforces what to build  ★
├───────────────────────────────────────┤
│  Code Generation    (Cursor, Copilot) │  ← writes the code
├───────────────────────────────────────┤
│  Code Execution   (OpenClaw, Devin)   │  ← runs the code
└───────────────────────────────────────┘
```

BushidoOS doesn't write code. It makes sure the **right code** gets written.

## Contributing

Contributions welcome! Please open an issue or PR.

## License

[MIT](LICENSE) — Built with honor. ⛩
