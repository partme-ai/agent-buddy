use crate::runtime::RuntimeKind;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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
    Unknown,
}

pub fn parse_deeplink(url: &str) -> anyhow::Result<DeepLinkRequest> {
    let trimmed = url.trim();
    let Some(without_scheme) = trimmed.strip_prefix("agentbuddy://") else {
        anyhow::bail!("unsupported deeplink scheme");
    };
    let (path, query) = without_scheme.split_once('?').unwrap_or((without_scheme, ""));
    let action = match path.trim_matches('/') {
        "install-source" => DeepLinkAction::InstallSource,
        "install-agent" => DeepLinkAction::InstallAgent,
        "install-bundle" => DeepLinkAction::InstallBundle,
        "install-skill" => DeepLinkAction::InstallSkill,
        "install-mcp" => DeepLinkAction::InstallMcp,
        "handoff" => DeepLinkAction::Handoff,
        _ => DeepLinkAction::Unknown,
    };
    Ok(DeepLinkRequest {
        raw_url: trimmed.to_string(),
        action,
        params: parse_query(query),
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
