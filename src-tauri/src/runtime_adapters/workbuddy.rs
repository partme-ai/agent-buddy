use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::WorkBuddy, key: "workbuddy", label: "WorkBuddy", scope: InstallScope::Global, generated_formats: &["SKILL.md"], install_targets: &["~/.workbuddy/skills/<agent>/SKILL.md"], native_actions: &["connector refresh prompt"] } }
