use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::CodeWhale, key: "codewhale", label: "CodeWhale", scope: InstallScope::Global, generated_formats: &["SKILL.md"], install_targets: &["~/.codewhale/skills/<agent>/SKILL.md"], native_actions: &[] } }
