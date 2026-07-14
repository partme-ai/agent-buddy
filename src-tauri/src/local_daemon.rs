use crate::local_api::LocalApiSpec;
use crate::mcp::McpServerConfig;
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDaemonStatus {
    pub enabled: bool,
    pub running: bool,
    pub bind_host: String,
    pub bind_port: u16,
    pub base_url: String,
    pub started_at: Option<i64>,
    pub route_count: usize,
    pub mcp_server_count: usize,
    pub last_error: Option<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDaemonStartResult { pub status: LocalDaemonStatus, pub message: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDaemonStopResult { pub status: LocalDaemonStatus, pub message: String }

struct DaemonRuntime {
    running: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
    bind_host: String,
    bind_port: u16,
    base_url: String,
    started_at: i64,
    route_count: usize,
    mcp_server_count: usize,
    last_error: Option<String>,
}

#[derive(Default)]
pub struct LocalDaemonControl { runtime: Mutex<Option<DaemonRuntime>> }

impl LocalDaemonControl {
    pub fn new() -> Self { Self { runtime: Mutex::new(None) } }

    pub fn start(&self, api: LocalApiSpec, mcp_servers: Vec<McpServerConfig>) -> anyhow::Result<LocalDaemonStartResult> {
        let mut guard = self.runtime.lock().map_err(|_| anyhow::anyhow!("local daemon lock poisoned"))?;
        if let Some(runtime) = guard.as_ref() {
            if runtime.running.load(Ordering::SeqCst) {
                return Ok(LocalDaemonStartResult { status: status_from_runtime(runtime), message: "Local daemon is already running.".to_string() });
            }
        }
        let address = format!("{}:{}", api.bind_host, api.bind_port);
        let listener = TcpListener::bind(&address)?;
        listener.set_nonblocking(true)?;
        let running = Arc::new(AtomicBool::new(true));
        let running_for_thread = running.clone();
        let route_count = api.routes.len();
        let mcp_server_count = mcp_servers.iter().filter(|server| server.enabled).count();
        let bind_host = api.bind_host.clone();
        let bind_port = api.bind_port;
        let base_url = api.base_url.clone();
        let handle = thread::spawn(move || run_loop(listener, running_for_thread));
        let runtime = DaemonRuntime { running, handle: Some(handle), bind_host, bind_port, base_url, started_at: chrono::Utc::now().timestamp(), route_count, mcp_server_count, last_error: None };
        let status = status_from_runtime(&runtime);
        *guard = Some(runtime);
        Ok(LocalDaemonStartResult { status, message: format!("Local daemon started on {address}.") })
    }

    pub fn stop(&self) -> LocalDaemonStopResult {
        let mut guard = match self.runtime.lock() {
            Ok(guard) => guard,
            Err(_) => return LocalDaemonStopResult { status: stopped_status("local daemon lock poisoned"), message: "Failed to lock local daemon state.".to_string() },
        };
        let Some(mut runtime) = guard.take() else {
            return LocalDaemonStopResult { status: stopped_status("local daemon was not running"), message: "Local daemon was not running.".to_string() };
        };
        runtime.running.store(false, Ordering::SeqCst);
        let _ = TcpStream::connect(format!("{}:{}", runtime.bind_host, runtime.bind_port));
        if let Some(handle) = runtime.handle.take() { let _ = handle.join(); }
        LocalDaemonStopResult { status: stopped_status("local daemon stopped"), message: "Local daemon stopped.".to_string() }
    }

    pub fn status(&self) -> LocalDaemonStatus {
        let Ok(guard) = self.runtime.lock() else { return stopped_status("local daemon lock poisoned"); };
        match guard.as_ref() {
            Some(runtime) if runtime.running.load(Ordering::SeqCst) => status_from_runtime(runtime),
            _ => stopped_status("local daemon is not running"),
        }
    }
}

fn run_loop(listener: TcpListener, running: Arc<AtomicBool>) {
    while running.load(Ordering::SeqCst) {
        match listener.accept() {
            Ok((stream, _)) => handle_stream(stream),
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(80)),
            Err(_) => thread::sleep(Duration::from_millis(200)),
        }
    }
}

fn handle_stream(mut stream: TcpStream) {
    let mut buffer = [0_u8; 8192];
    let read = stream.read(&mut buffer).unwrap_or(0);
    let request = String::from_utf8_lossy(&buffer[..read]);
    let first_line = request.lines().next().unwrap_or_default();
    let path = first_line.split_whitespace().nth(1).unwrap_or("/");
    let (status, body) = route_response(path);
    let response = format!("HTTP/1.1 {status}\r\nContent-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: content-type, authorization\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.as_bytes().len(), body);
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn route_response(path: &str) -> (&'static str, String) {
    match path {
        "/" | "/health" => ("200 OK", serde_json::json!({ "ok": true, "service": "agent-buddy-local-daemon", "version": "0.1.0" }).to_string()),
        "/api/runtimes" => ("200 OK", serde_json::json!({ "ok": true, "resource": "runtimes", "message": "Use the Tauri command bridge for full runtime data." }).to_string()),
        "/api/agents" => ("200 OK", serde_json::json!({ "ok": true, "resource": "agents", "message": "Use the Tauri command bridge for full local agent catalog." }).to_string()),
        "/api/installations" => ("200 OK", serde_json::json!({ "ok": true, "resource": "installations", "message": "Use the Tauri command bridge for full installation records." }).to_string()),
        "/mcp/memory" => mcp_response("buddy-memory", "Shared local memory provider endpoint is online."),
        "/mcp/knowledge" => mcp_response("buddy-knowledge", "Local knowledge retrieval endpoint is online."),
        "/mcp/session" => mcp_response("buddy-session", "Session event and handoff endpoint is online."),
        "/mcp/approval" => mcp_response("buddy-approval", "Approval endpoint is online."),
        "/api/sync/outbox/flush" => ("200 OK", serde_json::json!({ "ok": true, "resource": "sync-outbox", "message": "Sync flush endpoint is reserved; use Tauri command bridge for local preview." }).to_string()),
        _ => ("404 Not Found", serde_json::json!({ "ok": false, "error": "route_not_found", "path": path }).to_string()),
    }
}

fn mcp_response(service: &str, message: &str) -> (&'static str, String) {
    ("200 OK", serde_json::json!({ "jsonrpc": "2.0", "result": { "service": service, "status": "online", "message": message, "capabilities": ["health", "metadata", "tauri-command-bridge"] }, "id": null }).to_string())
}

fn status_from_runtime(runtime: &DaemonRuntime) -> LocalDaemonStatus {
    LocalDaemonStatus { enabled: true, running: true, bind_host: runtime.bind_host.clone(), bind_port: runtime.bind_port, base_url: runtime.base_url.clone(), started_at: Some(runtime.started_at), route_count: runtime.route_count, mcp_server_count: runtime.mcp_server_count, last_error: runtime.last_error.clone(), warnings: Vec::new() }
}

fn stopped_status(reason: &str) -> LocalDaemonStatus {
    LocalDaemonStatus { enabled: false, running: false, bind_host: "127.0.0.1".to_string(), bind_port: 17888, base_url: "http://127.0.0.1:17888".to_string(), started_at: None, route_count: 0, mcp_server_count: 0, last_error: None, warnings: vec![reason.to_string()] }
}
