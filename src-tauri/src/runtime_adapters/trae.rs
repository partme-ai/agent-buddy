use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Trae, key: "trae", label: "TRAE", scope: InstallScope::Project, generated_formats: &["rule.md"], install_targets: &["<project>/.trae/rules"], native_actions: &[] } }
