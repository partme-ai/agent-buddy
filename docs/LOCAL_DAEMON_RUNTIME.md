# Agent Buddy Local HTTP / MCP daemon runtime

This pass upgrades the Local API / MCP daemon from a preview plan to a minimal runnable local HTTP listener.

## Implemented module

```text
src-tauri/src/local_daemon.rs
```

## Runtime approach

The daemon currently uses the Rust standard library only:

```text
std::net::TcpListener
std::thread
std::sync::atomic::AtomicBool
```

No new dependency is introduced in this pass. This keeps the current Tauri/Rust project stable before validation.

## Added commands

```text
start_local_daemon
stop_local_daemon
get_local_daemon_status
```

Frontend wrappers:

```ts
startLocalDaemon()
stopLocalDaemon()
getLocalDaemonStatus()
```

## Routes

The daemon currently responds to these routes:

```text
GET  /
GET  /health
GET  /api/runtimes
GET  /api/agents
GET  /api/installations
POST /mcp/memory
POST /mcp/knowledge
POST /mcp/session
POST /mcp/approval
POST /api/sync/outbox/flush
```

The MCP endpoints return minimal JSON-RPC compatible metadata responses:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "service": "buddy-memory",
    "status": "online",
    "capabilities": ["health", "metadata", "tauri-command-bridge"]
  },
  "id": null
}
```

## Current behavior

The daemon is now actually runnable and can be started/stopped from Tauri commands. It is not yet a full MCP implementation.

Current scope:

```text
- Starts local listener on the configured Local API address.
- Returns health responses.
- Returns basic MCP endpoint metadata.
- Returns basic route metadata for API routes.
- Tracks running status in memory.
- Writes audit events when started or stopped.
```

## Not yet implemented

The following remain future work:

```text
- Full MCP protocol handling.
- Auth and local token verification.
- Request body parsing and validation.
- Memory read/write over HTTP.
- Knowledge retrieval over HTTP.
- Session event append over HTTP.
- Approval request/resolve over HTTP.
- Sync outbox flush execution over HTTP.
- Graceful server lifecycle integrated with Tauri app shutdown.
```

## Why this matters

Agent Buddy is intended to be the local Edge Plane. Without a real local daemon, Memory / Knowledge / Session are only UI-managed concepts. This pass makes the local service layer concrete and gives future Runtime adapters an addressable local endpoint.
