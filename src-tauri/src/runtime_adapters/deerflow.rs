use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::DeerFlow, key: "deerflow", label: "DeerFlow", scope: InstallScope::Custom, generated_formats: &["SKILL.md"], install_targets: &["DEERFLOW_SKILLS_DIR", "<project>/skills/custom"], native_actions: &[] } }
