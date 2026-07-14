use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Windsurf, key: "windsurf", label: "Windsurf", scope: InstallScope::Project, generated_formats: &[".windsurfrules"], install_targets: &["<project>/.windsurfrules"], native_actions: &[] } }
