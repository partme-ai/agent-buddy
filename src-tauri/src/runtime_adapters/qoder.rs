use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Qoder, key: "qoder", label: "Qoder", scope: InstallScope::Project, generated_formats: &["agent.md"], install_targets: &["<project>/.qoder/agents"], native_actions: &[] } }
