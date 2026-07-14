use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Antigravity, key: "antigravity", label: "Antigravity", scope: InstallScope::Global, generated_formats: &["SKILL.md"], install_targets: &["~/.gemini/antigravity/skills"], native_actions: &[] } }
