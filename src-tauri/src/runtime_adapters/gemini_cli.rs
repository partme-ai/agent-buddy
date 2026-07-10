use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::GeminiCli, key: "gemini-cli", label: "Gemini CLI", scope: InstallScope::Global, generated_formats: &["gemini-extension.json", "skills/*/SKILL.md"], install_targets: &["~/.gemini/extensions/agency-agents"], native_actions: &[] } }
