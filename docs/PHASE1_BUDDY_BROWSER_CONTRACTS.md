# Phase 1 Buddy Browser Contracts

This document records the first product-owned browser automation contracts added after the commercial architecture decision.

## Added source modules

```text
src-tauri/src/buddy_browser.rs
src-tauri/src/buddy_policy.rs
src-tauri/src/buddy_audit.rs
src/buddyBrowserTypes.ts
```

These files intentionally use Agent Buddy-owned names and contracts. They are not wrappers around OpenCLI, BrowserSkill, or browser-use.

## Purpose

Phase 1 is not yet a Chromium integration. It creates the stable internal product surface that later providers must implement:

```text
Buddy Browser DTOs
Buddy Policy decisions
Buddy Audit frames
Mock Browser Workbench state
Frontend shared types
```

## Buddy Browser contract

`buddy_browser.rs` defines:

- `BrowserProfile`
- `BrowserProvider`
- `BrowserSession`
- `BrowserSessionState`
- `BrowserTab`
- `PageSnapshot`
- `SnapshotSource`
- `ElementRef`
- `BrowserActionRequest`
- `BrowserAction`
- `BrowserActionResult`
- `BrowserActionError`
- `BrowserWorkbenchState`
- `mock_workbench_state()`

The contract is intentionally provider-neutral. A future implementation may use Buddy Browser, CDP, a BrowserSkill-like bridge, browser-use-like action loop, or another implementation behind the same DTOs.

## Buddy Policy contract

`buddy_policy.rs` defines:

- `PolicyContext`
- `AutomationMode`
- `PolicyDecision`
- `PolicyRiskLevel`
- `evaluate_browser_action()`
- `classify_action_risk()`
- `is_write_action()`
- `mock_policy_context()`

The first policy layer classifies actions into low, medium, high, and critical risk levels. It supports observe-only, assisted, confirm-before-write, and autonomous-low-risk modes.

## Buddy Audit contract

`buddy_audit.rs` defines:

- `AuditFrame`
- `AuditTimeline`
- `AuditFrameSummary`
- `build_audit_frame()`
- `summarize_action()`
- `summarize_timeline()`

This prepares browser action replay, screenshots, DOM diff, policy decisions, and action result history. Persistence is not wired yet.

## Frontend contract

`src/buddyBrowserTypes.ts` mirrors the Rust DTOs for Browser Workbench UI work. It allows frontend implementation to begin before a real browser provider exists.

## Current limitations

- These modules are contracts and mock primitives only.
- They are not yet registered in `lib.rs` Tauri commands.
- They are not yet persisted into SQLite.
- They do not control a real browser.
- They have not been compiled or typechecked in the current environment.

## Next implementation steps

1. Register Tauri commands:
   - `get_buddy_browser_workbench_state`
   - `evaluate_buddy_browser_action`
   - `preview_buddy_audit_frame`
2. Add SQLite persistence for audit frames.
3. Add Browser Workbench page or right-side workbench panel.
4. Replace mock provider with a CDP-backed provider.
5. Add human takeover states and confirmation UI.
6. Add CI validation before expanding provider code.
