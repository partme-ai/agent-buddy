use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::Command;

const PROTOCOL_SCHEME: &str = "agentbuddy";
const PROTOCOL_ACTION: &str = "register-protocol";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeepLinkRequest {
    pub raw_url: String,
    pub action: DeepLinkAction,
    pub params: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DeepLinkAction {
    InstallSource,
    InstallAgent,
    InstallBundle,
    InstallSkill,
    InstallMcp,
    Handoff,
    RegisterProtocol,
    Unknown,
}

#[derive(Debug, Clone)]
struct ProtocolRegistrationResult {
    registered: bool,
    platform: String,
    handler: String,
    message: String,
}

pub fn parse_deeplink(url: &str) -> anyhow::Result<DeepLinkRequest> {
    let trimmed = url.trim();
    let Some(without_scheme) = trimmed.strip_prefix("agentbuddy://") else {
        anyhow::bail!("unsupported deeplink scheme");
    };
    let (path, query) = without_scheme.split_once('?').unwrap_or((without_scheme, ""));
    let path = path.trim_matches('/');
    let action = match path {
        "install-source" => DeepLinkAction::InstallSource,
        "install-agent" => DeepLinkAction::InstallAgent,
        "install-bundle" => DeepLinkAction::InstallBundle,
        "install-skill" => DeepLinkAction::InstallSkill,
        "install-mcp" => DeepLinkAction::InstallMcp,
        "handoff" => DeepLinkAction::Handoff,
        PROTOCOL_ACTION => DeepLinkAction::RegisterProtocol,
        _ => DeepLinkAction::Unknown,
    };
    let mut params = parse_query(query);
    if matches!(action, DeepLinkAction::RegisterProtocol) {
        let execute = params.get("execute").is_some_and(|value| value == "true");
        let confirmed = params.get("confirm").is_some_and(|value| value == "true");
        let result = if execute && confirmed {
            register_protocol_handler()
        } else if execute {
            protocol_registration_status().with_message("Protocol registration requires confirm=true to perform OS-level changes.")
        } else {
            protocol_registration_status()
        };
        params.insert("protocolScheme".to_string(), PROTOCOL_SCHEME.to_string());
        params.insert("protocolRegistered".to_string(), result.registered.to_string());
        params.insert("registrationPlatform".to_string(), result.platform);
        params.insert("registrationHandler".to_string(), result.handler);
        params.insert("registrationMessage".to_string(), result.message);
    }
    Ok(DeepLinkRequest {
        raw_url: trimmed.to_string(),
        action,
        params,
    })
}

pub fn runtime_from_param(value: Option<&String>) -> Option<RuntimeKind> {
    let value = value?.as_str();
    Some(match value {
        "claude-code" | "claude" => RuntimeKind::ClaudeCode,
        "copilot" => RuntimeKind::Copilot,
        "antigravity" => RuntimeKind::Antigravity,
        "gemini-cli" | "gemini" => RuntimeKind::GeminiCli,
        "opencode" => RuntimeKind::OpenCode,
        "openclaw" => RuntimeKind::OpenClaw,
        "cursor" => RuntimeKind::Cursor,
        "trae" => RuntimeKind::Trae,
        "aider" => RuntimeKind::Aider,
        "windsurf" => RuntimeKind::Windsurf,
        "qwen" => RuntimeKind::Qwen,
        "codex" => RuntimeKind::Codex,
        "deerflow" => RuntimeKind::DeerFlow,
        "workbuddy" => RuntimeKind::WorkBuddy,
        "codewhale" => RuntimeKind::CodeWhale,
        "hermes" => RuntimeKind::Hermes,
        "kiro" => RuntimeKind::Kiro,
        "qoder" => RuntimeKind::Qoder,
        _ => return None,
    })
}

fn protocol_registration_status() -> ProtocolRegistrationResult {
    let handler = current_handler_command();
    if cfg!(target_os = "windows") {
        windows_status(handler)
    } else if cfg!(target_os = "linux") {
        linux_status(handler)
    } else if cfg!(target_os = "macos") {
        macos_status(handler)
    } else {
        ProtocolRegistrationResult {
            registered: false,
            platform: std::env::consts::OS.to_string(),
            handler,
            message: "Protocol registration is not implemented for this platform.".to_string(),
        }
    }
}

fn register_protocol_handler() -> ProtocolRegistrationResult {
    let handler = current_handler_command();
    if cfg!(target_os = "windows") {
        register_windows(handler)
    } else if cfg!(target_os = "linux") {
        register_linux(handler)
    } else if cfg!(target_os = "macos") {
        macos_status(handler).with_message("macOS registration requires CFBundleURLTypes in the app bundle Info.plist; status was checked only.")
    } else {
        ProtocolRegistrationResult {
            registered: false,
            platform: std::env::consts::OS.to_string(),
            handler,
            message: "Protocol registration is not implemented for this platform.".to_string(),
        }
    }
}

fn current_handler_command() -> String {
    let exe = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("agent-buddy"));
    if cfg!(target_os = "windows") {
        format!("\"{}\" \"%1\"", exe.display())
    } else {
        format!("{} %u", exe.display())
    }
}

fn windows_status(handler: String) -> ProtocolRegistrationResult {
    let query = Command::new("reg")
        .args(["query", r"HKCU\Software\Classes\agentbuddy\shell\open\command", "/ve"])
        .output();
    let registered = query.as_ref().is_ok_and(|output| {
        output.status.success() && String::from_utf8_lossy(&output.stdout).contains("agentbuddy")
    });
    ProtocolRegistrationResult {
        registered,
        platform: "windows".to_string(),
        handler,
        message: if registered { "HKCU protocol handler is registered." } else { "HKCU protocol handler is not registered." }.to_string(),
    }
}

fn register_windows(handler: String) -> ProtocolRegistrationResult {
    let commands = [
        vec!["add", r"HKCU\Software\Classes\agentbuddy", "/ve", "/d", "URL:Agent Buddy Protocol", "/f"],
        vec!["add", r"HKCU\Software\Classes\agentbuddy", "/v", "URL Protocol", "/d", "", "/f"],
        vec!["add", r"HKCU\Software\Classes\agentbuddy\shell\open\command", "/ve", "/d", handler.as_str(), "/f"],
    ];
    let mut messages = Vec::new();
    let mut ok = true;
    for args in commands {
        match Command::new("reg").args(args).output() {
            Ok(output) if output.status.success() => messages.push("reg command ok".to_string()),
            Ok(output) => {
                ok = false;
                messages.push(String::from_utf8_lossy(&output.stderr).trim().to_string());
            }
            Err(error) => {
                ok = false;
                messages.push(error.to_string());
            }
        }
    }
    ProtocolRegistrationResult { registered: ok, platform: "windows".to_string(), handler, message: messages.join("; ") }
}

fn linux_status(handler: String) -> ProtocolRegistrationResult {
    let desktop = linux_desktop_file();
    let mimeapps = linux_mimeapps_file();
    let registered = desktop.exists()
        && mimeapps.exists()
        && std::fs::read_to_string(&mimeapps).unwrap_or_default().contains("x-scheme-handler/agentbuddy=agent-buddy-agentbuddy.desktop");
    ProtocolRegistrationResult {
        registered,
        platform: "linux".to_string(),
        handler,
        message: if registered { "desktop entry and mimeapps mapping exist." } else { "desktop entry or mimeapps mapping missing." }.to_string(),
    }
}

fn register_linux(handler: String) -> ProtocolRegistrationResult {
    let desktop = linux_desktop_file();
    let mimeapps = linux_mimeapps_file();
    let result = (|| -> anyhow::Result<()> {
        if let Some(parent) = desktop.parent() { std::fs::create_dir_all(parent)?; }
        if let Some(parent) = mimeapps.parent() { std::fs::create_dir_all(parent)?; }
        let exe = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("agent-buddy"));
        let desktop_content = format!("[Desktop Entry]\nType=Application\nName=Agent Buddy\nExec={} %u\nTerminal=false\nMimeType=x-scheme-handler/agentbuddy;\nNoDisplay=true\n", exe.display());
        std::fs::write(&desktop, desktop_content)?;
        merge_mimeapps(&mimeapps, "x-scheme-handler/agentbuddy=agent-buddy-agentbuddy.desktop")?;
        Ok(())
    })();
    ProtocolRegistrationResult {
        registered: result.is_ok(),
        platform: "linux".to_string(),
        handler,
        message: result.map(|_| "desktop entry and mimeapps mapping registered.".to_string()).unwrap_or_else(|error| error.to_string()),
    }
}

fn macos_status(handler: String) -> ProtocolRegistrationResult {
    let exe = std::env::current_exe().unwrap_or_default();
    let bundle_candidate = infer_macos_bundle(&exe);
    ProtocolRegistrationResult {
        registered: bundle_candidate.is_some(),
        platform: "macos".to_string(),
        handler,
        message: bundle_candidate.map(|path| format!("Bundle candidate detected: {}. CFBundleURLTypes must include agentbuddy.", path.display())).unwrap_or_else(|| "Not running from a macOS .app bundle; protocol registration requires bundled Info.plist configuration.".to_string()),
    }
}

fn linux_desktop_file() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")).join(".local/share/applications/agent-buddy-agentbuddy.desktop")
}

fn linux_mimeapps_file() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")).join(".config/mimeapps.list")
}

fn merge_mimeapps(path: &Path, line: &str) -> anyhow::Result<()> {
    let existing = std::fs::read_to_string(path).unwrap_or_default();
    if existing.contains(line) {
        return Ok(());
    }
    let mut out = String::new();
    if existing.contains("[Default Applications]") {
        out.push_str(&existing);
        if !out.ends_with('\n') { out.push('\n'); }
        out.push_str(line);
        out.push('\n');
    } else {
        out.push_str("[Default Applications]\n");
        out.push_str(line);
        out.push('\n');
        out.push_str(&existing);
    }
    std::fs::write(path, out)?;
    Ok(())
}

fn infer_macos_bundle(exe: &Path) -> Option<PathBuf> {
    let mut cursor = exe;
    while let Some(parent) = cursor.parent() {
        if parent.extension().is_some_and(|value| value == "app") {
            return Some(parent.to_path_buf());
        }
        cursor = parent;
    }
    None
}

impl ProtocolRegistrationResult {
    fn with_message(mut self, message: &str) -> Self {
        self.message = message.to_string();
        self.registered = false;
        self
    }
}

fn parse_query(query: &str) -> BTreeMap<String, String> {
    let mut params = BTreeMap::new();
    for part in query.split('&') {
        if part.is_empty() {
            continue;
        }
        let (key, value) = part.split_once('=').unwrap_or((part, ""));
        params.insert(percent_decode(key), percent_decode(value));
    }
    params
}

fn percent_decode(value: &str) -> String {
    let mut out = String::new();
    let mut chars = value.as_bytes().iter().copied().peekable();
    while let Some(byte) = chars.next() {
        match byte {
            b'+' => out.push(' '),
            b'%' => {
                let h1 = chars.next();
                let h2 = chars.next();
                if let (Some(h1), Some(h2)) = (h1, h2) {
                    let hex = [h1, h2];
                    if let Ok(hex_str) = std::str::from_utf8(&hex) {
                        if let Ok(decoded) = u8::from_str_radix(hex_str, 16) {
                            out.push(decoded as char);
                            continue;
                        }
                    }
                }
                out.push('%');
            }
            _ => out.push(byte as char),
        }
    }
    out
}
