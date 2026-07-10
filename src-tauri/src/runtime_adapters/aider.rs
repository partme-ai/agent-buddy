use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Aider, key: "aider", label: "Aider", scope: InstallScope::Project, generated_formats: &["CONVENTIONS.md"], install_targets: &["<project>/CONVENTIONS.md"], native_actions: &[] } }
