use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Qwen, key: "qwen", label: "Qwen Code", scope: InstallScope::Project, generated_formats: &["agent.md"], install_targets: &["<project>/.qwen/agents"], native_actions: &[] } }
