# OpenCLI Reference Review for Agent Buddy

This document records how Agent Buddy should learn from `jackwener/OpenCLI` without turning OpenCLI into a required user-installed dependency.

## Reviewed repository

```text
https://github.com/jackwener/OpenCLI
```

OpenCLI positions itself as a way to convert websites, browser sessions, Electron apps, and local tools into deterministic interfaces for humans and AI agents. Its README says it can run browser automation against logged-in Chrome pages, including navigation, form filling, clicking, extraction, and automation.

## Strategic decision

Agent Buddy should treat OpenCLI as:

```text
Architecture reference + adapter-system reference + command-contract reference
```

Agent Buddy should not expose OpenCLI as:

```text
A required user dependency
A required CLI install step
A required browser extension install step
A required runtime process that users must configure manually
```

The commercial product rule remains unchanged: users should install only Agent Buddy. Browser runtime, bridge, profile, adapters, policy, audit, and update must be managed internally by Agent Buddy.

## Why OpenCLI is relevant

OpenCLI is relevant because it already explores several areas that Agent Buddy needs:

| OpenCLI capability | Agent Buddy equivalent |
|---|---|
| Website-to-CLI adapters | Buddy Adapter |
| Browser Bridge extension + local daemon | Buddy Bridge |
| Browser command primitives | Buddy Runtime actions |
| Logged-in Chrome session automation | Buddy Browser profiles |
| Structured command outputs | Buddy Protocol envelopes |
| Adapter authoring workflow | Buddy Adapter authoring pipeline |
| Doctor diagnostics | Buddy Doctor / Runtime health |
| Built-in site registry | Platform Capability Center |
| Skills for agents | Buddy Skill schema |

## What should be internalized

Agent Buddy should internalize the following ideas.

### 1. Adapter registry model

OpenCLI has a large adapter registry across sites and tools. Agent Buddy should adapt this into a signed commercial platform capability center:

```text
Buddy Adapter Center
├── recruitment
├── ecommerce
├── content
├── social
├── ai-tools
├── local-tools
└── generic-web
```

Each Adapter should have:

- adapter id;
- platform id;
- version;
- compatible page signatures;
- required profile scope;
- risk level;
- permissions;
- command/action schema;
- rollback policy;
- remote disable flag;
- signature metadata.

### 2. Browser action contract

OpenCLI's browser commands are valuable because they force the agent to operate through structured primitives instead of raw, unbounded browser scripting.

Agent Buddy should define the internal equivalent:

```rust
BrowserSession
BrowserPage
PageSnapshot
ElementRef
BrowserAction
ActionResult
ActionEnvelope
ActionError
```

The important concept is not the CLI surface. The important concept is the action contract:

```text
snapshot -> element refs -> action -> envelope -> verify -> next snapshot
```

### 3. Structured action envelopes

OpenCLI's browser skill emphasizes structured result envelopes, match counts, match confidence, stale reference recovery, structured errors, and verification after writes. Agent Buddy should implement this as Buddy Protocol:

```rust
pub struct ActionEnvelope<T> {
    pub ok: bool,
    pub action_id: String,
    pub session_id: String,
    pub page_id: String,
    pub result: Option<T>,
    pub error: Option<ActionError>,
    pub match_level: Option<MatchLevel>,
    pub candidates: Vec<ElementCandidate>,
    pub audit_frame_id: Option<String>,
}
```

Recommended match levels:

```text
exact
stable
reidentified
ambiguous
not_found
stale
```

### 4. Browser profile model

OpenCLI explicitly deals with multiple browser profiles and aliases. Agent Buddy needs the same concept, but product-owned:

```text
Buddy Profile
├── personal
├── work
├── client-a
└── recruiting
```

Profile management should live inside Agent Buddy and Buddy Browser, not in a user-managed Chrome profile or extension setup.

### 5. Doctor diagnostics

OpenCLI's `doctor` concept maps directly to Agent Buddy's commercial support need. Agent Buddy should implement Doctor checks for:

- Buddy Browser installed and signed;
- Buddy Runtime reachable;
- Buddy Bridge connected;
- profile state healthy;
- adapter version compatible;
- policy state valid;
- action queue healthy;
- audit writer healthy;
- update channel healthy.

### 6. Adapter authoring workflow

OpenCLI's adapter authoring flow is useful as a development workflow reference. Agent Buddy should convert it into an internal Adapter Studio, not a user-facing CLI:

```text
Recon
→ Endpoint / DOM / workflow discovery
→ Auth mode classification
→ Adapter schema generation
→ Test run
→ Verify
→ Sign
→ Publish to Adapter Center
```

## What should not be copied as-is

The following parts should not become Agent Buddy's user-facing product model:

| OpenCLI pattern | Agent Buddy decision |
|---|---|
| `npm install -g @jackwener/opencli` | Not user-facing |
| `opencli` CLI as primary interface | Internal/dev only |
| Chrome Web Store extension install | Replaced by built-in Buddy Bridge |
| User's existing Chrome as required runtime | Replaced by Buddy Browser |
| User-managed profile aliasing | Replaced by Buddy Profile Manager |
| Agent skills that call shell commands | Replaced by internal Rust/Tauri APIs |
| Ad-hoc adapter install from GitHub | Replaced by signed Adapter Center |

## License and compliance note

OpenCLI is licensed as Apache-2.0. That makes it more commercially usable than AGPL-style projects, but Agent Buddy must still preserve license and notice obligations if any code is copied or modified.

Recommended use levels:

| Use level | Recommendation |
|---|---|
| Study architecture | Yes |
| Reuse protocol ideas | Yes |
| Reimplement in Rust | Preferred |
| Copy isolated permissive code | Possible with NOTICE and attribution |
| Expose OpenCLI as required dependency | No |
| Ship unmodified OpenCLI branding in Agent Buddy | No |

## Mapping into Agent Buddy modules

| Agent Buddy module | OpenCLI inspiration |
|---|---|
| Buddy Runtime | Browser command primitives, action envelopes, tab/session lifecycle |
| Buddy Browser | Logged-in browser session automation, profile lifecycle |
| Buddy Bridge | Extension/daemon communication concept, but built into Buddy Browser |
| Buddy Adapter | Site command registry and adapter authoring pipeline |
| Buddy Protocol | Structured output envelopes and error codes |
| Buddy Policy | Write-action confirmation, risk gates, rate limits |
| Buddy Audit | Action trace, screenshots, state before/after, replay |
| Buddy Doctor | Connectivity and health diagnostics |

## Recommended implementation direction

The next code phase should not import OpenCLI directly. It should create Agent Buddy-owned abstractions first:

```text
crates/buddy-browser-core
crates/buddy-browser-profile
crates/buddy-browser-policy
crates/buddy-browser-audit
crates/buddy-protocol
crates/buddy-adapter
```

Then introduce one mock provider and one local browser provider:

```text
MockBrowserProvider
BuddyBrowserProvider
```

Only after Agent Buddy owns the traits, DTOs, policy model, and audit format should we evaluate whether to port or adapt selected Apache-2.0 OpenCLI implementation details.

## Product conclusion

OpenCLI validates the direction that websites can become deterministic agent-operable interfaces. However, Agent Buddy's commercial value comes from hiding all CLI, extension, setup, and profile complexity behind a single installable product.

Final decision:

```text
Use OpenCLI as a reference for Buddy Runtime and Buddy Adapter design.
Do not make OpenCLI a required runtime dependency for commercial Agent Buddy.
```
