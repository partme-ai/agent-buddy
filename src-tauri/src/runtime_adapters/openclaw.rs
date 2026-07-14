use super::RuntimeAdapterDescriptor;
use crate::runtime::{InstallScope, RuntimeKind};
pub fn descriptor() -> RuntimeAdapterDescriptor { RuntimeAdapterDescriptor { kind: RuntimeKind::OpenClaw, key: "openclaw", label: "OpenClaw", scope: InstallScope::Global, generated_formats: &["SOUL.md", "AGENTS.md", "IDENTITY.md"], install_targets: &["~/.openclaw/agency-agents/<agent>"], native_actions: &["openclaw agents add", "gateway restart prompt"] } }
