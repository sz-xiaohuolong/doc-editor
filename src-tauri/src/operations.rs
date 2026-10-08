use std::fs;
use std::path::{Path, PathBuf};
use chrono::Local;

pub fn sanitize_filename(name: &str) -> String {
    let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    let cleaned: String = name
        .chars()
        .map(|c| if invalid_chars.contains(&c) { '_' } else { c })
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        "Untitled".to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn create_page(parent_dir: &Path, title: &str) -> Result<PathBuf, String> {
    let clean_title = sanitize_filename(title);
    let mut file_name = format!("{}.md", clean_title);
    let mut target_path = parent_dir.join(&file_name);

    let mut counter = 1;
    while target_path.exists() {
        file_name = format!("{} ({}).md", clean_title, counter);
        target_path = parent_dir.join(&file_name);
        counter += 1;
    }

    fs::create_dir_all(parent_dir).map_err(|e| e.to_string())?;
    let initial_content = format!("# {}\n\n", clean_title);
    fs::write(&target_path, initial_content).map_err(|e| e.to_string())?;
    Ok(target_path)
}

pub fn create_subpage(parent_md_path: &Path, title: &str) -> Result<PathBuf, String> {
    let parent_dir = parent_md_path
        .parent()
        .ok_or_else(|| "Parent file has no directory".to_string())?;
    let parent_stem = parent_md_path
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "Invalid parent filename".to_string())?;

    let sub_folder = parent_dir.join(parent_stem);
    fs::create_dir_all(&sub_folder).map_err(|e| e.to_string())?;

    create_page(&sub_folder, title)
}

pub fn rename_page_and_folder(old_md_path: &Path, new_title: &str) -> Result<PathBuf, String> {
    if !old_md_path.exists() {
        return Err("File does not exist".to_string());
    }

    let parent_dir = old_md_path
        .parent()
        .ok_or_else(|| "File has no parent directory".to_string())?;
    let old_stem = old_md_path
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "Invalid file stem".to_string())?;

    let clean_new_title = sanitize_filename(new_title);
    if old_stem == clean_new_title {
        return Ok(old_md_path.to_path_buf());
    }

    let new_md_path = parent_dir.join(format!("{}.md", clean_new_title));
    if new_md_path.exists() {
        return Err(format!("A file named '{}.md' already exists in this folder", clean_new_title));
    }

    // Check if there is an associated child pages folder
    let old_folder = parent_dir.join(old_stem);
    if old_folder.exists() && old_folder.is_dir() {
        let new_folder = parent_dir.join(&clean_new_title);
        fs::rename(&old_folder, &new_folder).map_err(|e| e.to_string())?;
    }

    // Rename .md file
    fs::rename(old_md_path, &new_md_path).map_err(|e| e.to_string())?;
    Ok(new_md_path)
}

pub fn delete_page_and_folder(md_path: &Path) -> Result<(), String> {
    if !md_path.exists() {
        return Ok(());
    }

    let parent_dir = md_path
        .parent()
        .ok_or_else(|| "File has no parent directory".to_string())?;
    let stem = md_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    // If an associated subfolder exists, remove it recursively
    let matching_folder = parent_dir.join(stem);
    if matching_folder.exists() && matching_folder.is_dir() {
        let _ = fs::remove_dir_all(&matching_folder);
    }

    fs::remove_file(md_path).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn save_image_asset(workspace_root: &Path, image_bytes: &[u8]) -> Result<String, String> {
    let assets_dir = workspace_root.join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y%m%d_%H%M%S");
    let file_name = format!("img_{}.png", now);
    let target_file = assets_dir.join(&file_name);

    fs::write(&target_file, image_bytes).map_err(|e| e.to_string())?;
    Ok(format!("assets/{}", file_name))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_create_and_rename_folder_note() {
        let temp_dir = std::env::temp_dir().join(format!("test_ops_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        // 1. Create root page
        let page_path = create_page(&temp_dir, "MyPage").unwrap();
        assert!(page_path.exists());
        assert_eq!(page_path.file_name().unwrap(), "MyPage.md");

        // 2. Create subpage under MyPage
        let sub_path = create_subpage(&page_path, "SubPage1").unwrap();
        assert!(sub_path.exists());
        assert_eq!(sub_path.file_name().unwrap(), "SubPage1.md");
        assert!(temp_dir.join("MyPage").is_dir());

        // 3. Rename MyPage to NewMyPage
        let renamed_path = rename_page_and_folder(&page_path, "NewMyPage").unwrap();
        assert!(renamed_path.exists());
        assert!(!page_path.exists());
        // Verify child folder was also renamed
        assert!(temp_dir.join("NewMyPage").is_dir());
        assert!(!temp_dir.join("MyPage").exists());
        assert!(temp_dir.join("NewMyPage").join("SubPage1.md").exists());

        // 4. Delete page and folder
        delete_page_and_folder(&renamed_path).unwrap();
        assert!(!renamed_path.exists());
        assert!(!temp_dir.join("NewMyPage").exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("valid_name"), "valid_name");
        assert_eq!(sanitize_filename("invalid/name:test*"), "invalid_name_test_");
        assert_eq!(sanitize_filename("   "), "Untitled");
    }
}

