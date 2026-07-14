use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::Hermes, key: "hermes", label: "Hermes Agent", scope: InstallScope::Global, generated_formats: &["<category>/<agent>/SKILL.md"], install_targets: &["HERMES_HOME/skills", "~/.hermes/skills"], native_actions: &["category-limited install recommendation"] } }
