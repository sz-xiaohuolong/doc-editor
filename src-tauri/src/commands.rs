use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};
use crate::fs_utils::{atomic_write_file, read_file_string, validate_path_in_workspace};
use crate::models::{AppConfig, FileTreeNode};
use crate::operations::{
    create_page, create_subpage, delete_page_and_folder, rename_page_and_folder,
    save_image_asset,
};
use crate::tree::scan_folder_notes_tree;
use crate::watcher::{start_watching, WatcherState};
use crate::welcome::ensure_welcome_page;
use crate::workspace::{load_config, save_config};

#[tauri::command]
pub fn get_last_workspace() -> Option<String> {
    load_config().last_workspace
}

#[tauri::command]
pub fn set_last_workspace(path: String) -> Result<(), String> {
    save_config(&AppConfig {
        last_workspace: Some(path),
    })
}

#[tauri::command]
pub fn scan_workspace(path: String) -> Result<Vec<FileTreeNode>, String> {
    let root = Path::new(&path);
    if !root.exists() {
        return Err("Workspace folder does not exist".to_string());
    }

    // If workspace is completely empty, generate Welcome page
    if let Ok(entries) = std::fs::read_dir(root) {
        if entries.count() == 0 {
            let _ = ensure_welcome_page(root);
        }
    }

    scan_folder_notes_tree(root)
}

#[tauri::command]
pub fn read_document(workspace_root: String, file_path: String) -> Result<String, String> {
    let root = Path::new(&workspace_root);
    let target = Path::new(&file_path);
    let safe_target = validate_path_in_workspace(root, target)?;
    read_file_string(&safe_target).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_document(
    workspace_root: String,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let root = Path::new(&workspace_root);
    let target = Path::new(&file_path);
    let safe_target = validate_path_in_workspace(root, target)?;
    atomic_write_file(&safe_target, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_new_page(
    workspace_root: String,
    parent_dir: String,
    title: String,
) -> Result<FileTreeNode, String> {
    let root = Path::new(&workspace_root);
    let parent = Path::new(&parent_dir);
    let safe_parent = validate_path_in_workspace(root, parent)?;

    let target_path = create_page(&safe_parent, &title)?;
    let base_name = target_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&title)
        .to_string();

    Ok(FileTreeNode {
        id: target_path.to_string_lossy().to_string(),
        name: base_name,
        file_path: target_path.to_string_lossy().to_string(),
        folder_path: None,
        has_subpages: false,
        children: Vec::new(),
    })
}

#[tauri::command]
pub fn create_new_subpage(
    workspace_root: String,
    parent_md_path: String,
    title: String,
) -> Result<FileTreeNode, String> {
    let root = Path::new(&workspace_root);
    let parent = Path::new(&parent_md_path);
    let safe_parent = validate_path_in_workspace(root, parent)?;

    let target_path = create_subpage(&safe_parent, &title)?;
    let base_name = target_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&title)
        .to_string();

    Ok(FileTreeNode {
        id: target_path.to_string_lossy().to_string(),
        name: base_name,
        file_path: target_path.to_string_lossy().to_string(),
        folder_path: None,
        has_subpages: false,
        children: Vec::new(),
    })
}

#[tauri::command]
pub fn rename_page(
    workspace_root: String,
    old_md_path: String,
    new_title: String,
) -> Result<String, String> {
    let root = Path::new(&workspace_root);
    let old_path = Path::new(&old_md_path);
    let safe_old = validate_path_in_workspace(root, old_path)?;

    let new_path = rename_page_and_folder(&safe_old, &new_title)?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_page(workspace_root: String, md_path: String) -> Result<(), String> {
    let root = Path::new(&workspace_root);
    let target = Path::new(&md_path);
    let safe_target = validate_path_in_workspace(root, target)?;
    delete_page_and_folder(&safe_target)
}

#[tauri::command]
pub fn save_image(workspace_root: String, image_bytes: Vec<u8>) -> Result<String, String> {
    let root = Path::new(&workspace_root);
    save_image_asset(root, &image_bytes)
}

#[tauri::command]
pub fn start_watch(
    app: AppHandle,
    workspace_path: String,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let root = PathBuf::from(workspace_path);
    start_watching(app, &root, &state)
}
