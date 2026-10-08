use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use crate::models::FileTreeNode;

/// Recursively scans workspace directory for Markdown files and subdirectories
/// using the Folder-Notes architectural pattern.
pub fn scan_folder_notes_tree(dir: &Path) -> Result<Vec<FileTreeNode>, String> {
    if !dir.exists() || !dir.is_dir() {
        return Err(format!("Directory does not exist: {:?}", dir));
    }

    let mut nodes: Vec<FileTreeNode> = Vec::new();
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    let mut md_files: Vec<PathBuf> = Vec::new();
    let mut sub_dirs: Vec<PathBuf> = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name,
            None => continue,
        };

        // Skip hidden files, system files, assets, git folders
        if file_name.starts_with('.') || file_name == "assets" || file_name == "node_modules" {
            continue;
        }

        if path.is_file() && file_name.ends_with(".md") {
            md_files.push(path);
        } else if path.is_dir() {
            sub_dirs.push(path);
        }
    }

    let mut processed_dir_names: HashSet<String> = HashSet::new();

    // Process all .md files
    for md_path in md_files {
        let base_name = md_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();

        let matching_dir = dir.join(&base_name);
        let has_matching_dir = matching_dir.exists() && matching_dir.is_dir();

        let (children, folder_path, has_subpages) = if has_matching_dir {
            processed_dir_names.insert(base_name.clone());
            let child_nodes = scan_folder_notes_tree(&matching_dir).unwrap_or_default();
            (child_nodes, Some(matching_dir.to_string_lossy().to_string()), true)
        } else {
            (Vec::new(), None, false)
        };

        let node = FileTreeNode {
            id: md_path.to_string_lossy().to_string(),
            name: base_name,
            file_path: md_path.to_string_lossy().to_string(),
            folder_path,
            has_subpages,
            children,
        };
        nodes.push(node);
    }

    // Process any orphaned subdirectories without a matching .md file
    for dir_path in sub_dirs {
        let dir_name = match dir_path.file_name().and_then(|s| s.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };

        if processed_dir_names.contains(&dir_name) {
            continue;
        }

        // Auto-create or represent the folder as a Folder-Note
        let auto_md_path = dir.join(format!("{}.md", dir_name));
        if !auto_md_path.exists() {
            let _ = fs::write(&auto_md_path, format!("# {}\n\n", dir_name));
        }

        let child_nodes = scan_folder_notes_tree(&dir_path).unwrap_or_default();
        let node = FileTreeNode {
            id: auto_md_path.to_string_lossy().to_string(),
            name: dir_name,
            file_path: auto_md_path.to_string_lossy().to_string(),
            folder_path: Some(dir_path.to_string_lossy().to_string()),
            has_subpages: true,
            children: child_nodes,
        };
        nodes.push(node);
    }

    // Sort alphabetically
    nodes.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(nodes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_scan_folder_notes_tree() {
        let temp_dir = std::env::temp_dir().join(format!("test_tree_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Create Note1.md
        fs::write(temp_dir.join("Note1.md"), "# Note 1\n").unwrap();

        // Create Note2.md with child pages
        fs::write(temp_dir.join("Note2.md"), "# Note 2\n").unwrap();
        let sub_dir = temp_dir.join("Note2");
        fs::create_dir_all(&sub_dir).unwrap();
        fs::write(sub_dir.join("ChildA.md"), "# Child A\n").unwrap();

        let tree = scan_folder_notes_tree(&temp_dir).unwrap();
        assert_eq!(tree.len(), 2);

        let note1 = &tree[0];
        assert_eq!(note1.name, "Note1");
        assert_eq!(note1.has_subpages, false);
        assert_eq!(note1.children.len(), 0);

        let note2 = &tree[1];
        assert_eq!(note2.name, "Note2");
        assert_eq!(note2.has_subpages, true);
        assert_eq!(note2.children.len(), 1);
        assert_eq!(note2.children[0].name, "ChildA");

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

