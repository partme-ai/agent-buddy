use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Cursor, key: "cursor", label: "Cursor", scope: InstallScope::Project, generated_formats: &["rule.mdc"], install_targets: &["<project>/.cursor/rules"], native_actions: &[] } }
