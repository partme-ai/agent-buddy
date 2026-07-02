use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgePackage {
    pub id: String,
    pub package_type: KnowledgePackageType,
    pub name: String,
    pub description: String,
    pub source: String,
    pub version: String,
    pub manifest_path: Option<String>,
    pub document_count: usize,
    pub chunk_count: usize,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum KnowledgePackageType {
    LlmWiki,
    LlmRag,
    Qa,
    DocumentSet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeMirrorPlan {
    pub package: KnowledgePackage,
    pub local_root: String,
    pub files: Vec<KnowledgeMirrorFile>,
    pub index_plan: KnowledgeIndexPlan,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeMirrorFile {
    pub relative_path: String,
    pub purpose: String,
    pub content_preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeIndexPlan {
    pub chunk_strategy: String,
    pub vector_index: String,
    pub keyword_index: String,
    pub acl_mode: String,
    pub context_pack_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeContextPack {
    pub id: String,
    pub query: String,
    pub space_ids: Vec<String>,
    pub snippets: Vec<KnowledgeSnippet>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeSnippet {
    pub source_id: String,
    pub title: String,
    pub content: String,
    pub score: f64,
}

pub fn build_wiki_mirror_plan(space_id: String, app_data_dir: &Path) -> KnowledgeMirrorPlan {
    let package = KnowledgePackage {
        id: space_id.clone(),
        package_type: KnowledgePackageType::LlmWiki,
        name: format!("{space_id} Wiki"),
        description: "LLM-Wiki package mirrored from Agent PaaS into local Agent Buddy storage.".to_string(),
        source: "agent-paas".to_string(),
        version: "local-preview".to_string(),
        manifest_path: Some(app_data_dir.join("knowledge").join(&space_id).join("manifest.json").display().to_string()),
        document_count: 0,
        chunk_count: 0,
    };
    plan_for_package(package, app_data_dir)
}

pub fn build_rag_mirror_plan(space_id: String, app_data_dir: &Path) -> KnowledgeMirrorPlan {
    let package = KnowledgePackage {
        id: space_id.clone(),
        package_type: KnowledgePackageType::LlmRag,
        name: format!("{space_id} RAG"),
        description: "LLM-RAG QA package mirrored from Agent PaaS into local Agent Buddy storage.".to_string(),
        source: "agent-paas".to_string(),
        version: "local-preview".to_string(),
        manifest_path: Some(app_data_dir.join("knowledge").join(&space_id).join("manifest.json").display().to_string()),
        document_count: 0,
        chunk_count: 0,
    };
    plan_for_package(package, app_data_dir)
}

pub fn build_context_pack(query: String, space_ids: Vec<String>) -> KnowledgeContextPack {
    KnowledgeContextPack {
        id: Uuid::new_v4().to_string(),
        query: query.clone(),
        space_ids: space_ids.clone(),
        snippets: space_ids.into_iter().map(|space_id| KnowledgeSnippet {
            source_id: space_id.clone(),
            title: format!("Context from {space_id}"),
            content: format!("Local knowledge context placeholder for query: {query}"),
            score: 0.5,
        }).collect(),
        created_at: chrono::Utc::now().timestamp(),
    }
}

fn plan_for_package(package: KnowledgePackage, app_data_dir: &Path) -> KnowledgeMirrorPlan {
    let local_root = app_data_dir.join("knowledge").join(&package.id);
    KnowledgeMirrorPlan {
        package,
        local_root: local_root.display().to_string(),
        files: vec![
            KnowledgeMirrorFile { relative_path: "manifest.json".to_string(), purpose: "Package manifest and version metadata".to_string(), content_preview: "{\"version\":\"local-preview\"}".to_string() },
            KnowledgeMirrorFile { relative_path: "documents/".to_string(), purpose: "Original mirrored documents".to_string(), content_preview: "directory".to_string() },
            KnowledgeMirrorFile { relative_path: "chunks/chunks.jsonl".to_string(), purpose: "Chunked local knowledge records".to_string(), content_preview: "jsonl".to_string() },
            KnowledgeMirrorFile { relative_path: "index/vector/".to_string(), purpose: "Local vector index".to_string(), content_preview: "directory".to_string() },
            KnowledgeMirrorFile { relative_path: "index/keyword/".to_string(), purpose: "Local keyword index".to_string(), content_preview: "directory".to_string() },
        ],
        index_plan: KnowledgeIndexPlan { chunk_strategy: "markdown-heading-plus-token-window".to_string(), vector_index: "local-vector-index".to_string(), keyword_index: "tantivy-compatible".to_string(), acl_mode: "paas-acl-mirror".to_string(), context_pack_enabled: true },
        warnings: vec!["This is a local mirror plan. Actual document download and indexing will be performed by the sync worker.".to_string()],
    }
}

pub fn mirror_root(app_data_dir: &Path, space_id: &str) -> PathBuf {
    app_data_dir.join("knowledge").join(space_id)
}
