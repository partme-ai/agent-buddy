use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserProfile {
    pub id: String,
    pub name: String,
    pub provider: BrowserProvider,
    pub persistent: bool,
    pub profile_dir: Option<String>,
    pub signed_in_domains: Vec<String>,
    pub last_used_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BrowserProvider {
    Mock,
    BuddyBrowser,
    ExternalChromium,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserSession {
    pub id: String,
    pub profile_id: String,
    pub label: String,
    pub state: BrowserSessionState,
    pub created_at: i64,
    pub last_active_at: i64,
    pub tabs: Vec<BrowserTab>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BrowserSessionState {
    Created,
    Active,
    WaitingForUser,
    Closed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserTab {
    pub id: String,
    pub title: String,
    pub url: String,
    pub active: bool,
    pub owned_by_agent: bool,
    pub borrowed_from_user: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageSnapshot {
    pub session_id: String,
    pub tab_id: String,
    pub url: String,
    pub title: String,
    pub source: SnapshotSource,
    pub captured_at: i64,
    pub elements: Vec<ElementRef>,
    pub text_preview: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SnapshotSource {
    Dom,
    AccessibilityTree,
    ScreenshotAnnotation,
    Network,
    Mock,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ElementRef {
    pub ref_id: String,
    pub role: Option<String>,
    pub name: Option<String>,
    pub text: Option<String>,
    pub selector: Option<String>,
    pub visible: bool,
    pub enabled: bool,
    pub fingerprint: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserActionRequest {
    pub session_id: String,
    pub tab_id: Option<String>,
    pub action: BrowserAction,
    pub reason: String,
    pub requested_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum BrowserAction {
    Open { url: String },
    Click { target: String },
    Type { target: String, text: String },
    Fill { fields: BTreeMap<String, String> },
    Select { target: String, value: String },
    Keys { keys: Vec<String> },
    Scroll { direction: String, amount: i64 },
    Screenshot,
    Extract { instruction: String },
    WaitFor { condition: String, timeout_ms: u64 },
    CloseTab { tab_id: String },
    HumanTakeover { reason: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserActionResult {
    pub action_id: String,
    pub ok: bool,
    pub session_id: String,
    pub tab_id: Option<String>,
    pub match_level: Option<MatchLevel>,
    pub before_snapshot_id: Option<String>,
    pub after_snapshot_id: Option<String>,
    pub message: String,
    pub warnings: Vec<String>,
    pub error: Option<BrowserActionError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MatchLevel {
    Exact,
    Stable,
    Reidentified,
    Unverified,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserActionError {
    pub code: String,
    pub message: String,
    pub hint: Option<String>,
    pub candidates: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserWorkbenchState {
    pub profiles: Vec<BrowserProfile>,
    pub sessions: Vec<BrowserSession>,
    pub latest_snapshot: Option<PageSnapshot>,
    pub supported_actions: Vec<String>,
    pub warnings: Vec<String>,
}

pub fn mock_workbench_state() -> BrowserWorkbenchState {
    let now = chrono::Utc::now().timestamp();
    let profile = BrowserProfile {
        id: "profile-local-default".to_string(),
        name: "Local Default".to_string(),
        provider: BrowserProvider::Mock,
        persistent: true,
        profile_dir: None,
        signed_in_domains: vec!["example.com".to_string()],
        last_used_at: Some(now),
    };
    let tab = BrowserTab { id: "tab-mock-main".to_string(), title: "Mock Page".to_string(), url: "https://example.com".to_string(), active: true, owned_by_agent: true, borrowed_from_user: false };
    let session = BrowserSession { id: "session-mock".to_string(), profile_id: profile.id.clone(), label: "Mock Browser Session".to_string(), state: BrowserSessionState::Active, created_at: now, last_active_at: now, tabs: vec![tab.clone()], warnings: vec!["Mock provider only; no real browser automation is running yet.".to_string()] };
    let snapshot = PageSnapshot {
        session_id: session.id.clone(),
        tab_id: tab.id,
        url: "https://example.com".to_string(),
        title: "Mock Page".to_string(),
        source: SnapshotSource::Mock,
        captured_at: now,
        elements: vec![ElementRef { ref_id: "1".to_string(), role: Some("button".to_string()), name: Some("Continue".to_string()), text: Some("Continue".to_string()), selector: Some("button[data-buddy-mock='continue']".to_string()), visible: true, enabled: true, fingerprint: BTreeMap::from([("role".to_string(), "button".to_string()), ("name".to_string(), "Continue".to_string())]) }],
        text_preview: "Mock browser page for Buddy Browser Workbench development.".to_string(),
        warnings: Vec::new(),
    };
    BrowserWorkbenchState { profiles: vec![profile], sessions: vec![session], latest_snapshot: Some(snapshot), supported_actions: vec!["open".to_string(), "click".to_string(), "type".to_string(), "extract".to_string(), "human-takeover".to_string()], warnings: vec!["Buddy Browser contract is ready; provider is still mock.".to_string()] }
}
