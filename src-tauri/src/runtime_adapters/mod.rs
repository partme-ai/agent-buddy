pub mod claude_code;
pub mod copilot;
pub mod antigravity;
pub mod gemini_cli;
pub mod opencode;
pub mod openclaw;
pub mod cursor;
pub mod trae;
pub mod aider;
pub mod windsurf;
pub mod qwen;
pub mod codex;
pub mod deerflow;
pub mod workbuddy;
pub mod codewhale;
pub mod hermes;
pub mod kiro;
pub mod qoder;

use crate::runtime::{InstallScope, RuntimeKind};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeAdapterDescriptor {
    pub kind: RuntimeKind,
    pub key: &'static str,
    pub label: &'static str,
    pub scope: InstallScope,
    pub generated_formats: &'static [&'static str],
    pub install_targets: &'static [&'static str],
    pub native_actions: &'static [&'static str],
}

pub fn descriptors() -> Vec<RuntimeAdapterDescriptor> {
    vec![
        claude_code::descriptor(), copilot::descriptor(), antigravity::descriptor(), gemini_cli::descriptor(),
        opencode::descriptor(), openclaw::descriptor(), cursor::descriptor(), trae::descriptor(),
        aider::descriptor(), windsurf::descriptor(), qwen::descriptor(), codex::descriptor(),
        deerflow::descriptor(), workbuddy::descriptor(), codewhale::descriptor(), hermes::descriptor(),
        kiro::descriptor(), qoder::descriptor(),
    ]
}
