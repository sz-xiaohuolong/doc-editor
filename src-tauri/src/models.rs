use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileTreeNode {
    pub id: String,
    pub name: String,
    pub file_path: String,
    pub folder_path: Option<String>,
    pub has_subpages: bool,
    pub children: Vec<FileTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub last_workspace: Option<String>,
}
