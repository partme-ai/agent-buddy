use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskScanReport {
    pub total_findings: usize,
    pub findings: Vec<RiskFinding>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskFinding {
    pub severity: RiskSeverity,
    pub rule_id: String,
    pub message: String,
    pub matched: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskSeverity {
    Info,
    Warning,
    High,
    Critical,
}

pub fn scan_text(content: &str) -> RiskScanReport {
    let mut findings = Vec::new();
    for rule in risk_rules() {
        if content.to_lowercase().contains(rule.pattern) {
            findings.push(RiskFinding {
                severity: rule.severity,
                rule_id: rule.id.to_string(),
                message: rule.message.to_string(),
                matched: rule.pattern.to_string(),
            });
        }
    }
    RiskScanReport { total_findings: findings.len(), findings }
}

struct RiskRule {
    id: &'static str,
    pattern: &'static str,
    severity: RiskSeverity,
    message: &'static str,
}

fn risk_rules() -> Vec<RiskRule> {
    vec![
        RiskRule { id: "shell-rm-rf", pattern: "rm -rf", severity: RiskSeverity::Critical, message: "Potential destructive shell command." },
        RiskRule { id: "shell-sudo", pattern: "sudo ", severity: RiskSeverity::High, message: "Privileged shell execution should require approval." },
        RiskRule { id: "secret-env", pattern: "api_key", severity: RiskSeverity::Warning, message: "Possible secret reference; ensure secrets are stored in a vault." },
        RiskRule { id: "secret-token", pattern: "token", severity: RiskSeverity::Info, message: "Token reference detected; review before installing." },
        RiskRule { id: "network-curl", pattern: "curl ", severity: RiskSeverity::Warning, message: "Network command detected; review network policy." },
        RiskRule { id: "network-wget", pattern: "wget ", severity: RiskSeverity::Warning, message: "Network command detected; review network policy." },
        RiskRule { id: "prompt-injection", pattern: "ignore previous instructions", severity: RiskSeverity::High, message: "Prompt-injection-like phrase detected." },
    ]
}
