use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Kiro, key: "kiro", label: "Kiro", scope: InstallScope::Global, generated_formats: &["agent.md"], install_targets: &["~/.kiro/agents"], native_actions: &[] } }
