use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

/// Validate that target_path is within workspace_root to prevent path traversal attacks.
pub fn validate_path_in_workspace(workspace_root: &Path, target_path: &Path) -> Result<PathBuf, String> {
    let canonical_root = workspace_root
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize workspace root: {}", e))?;

    // If target doesn't exist yet (e.g. creating new file), check its parent
    let canonical_target = if target_path.exists() {
        target_path
            .canonicalize()
            .map_err(|e| format!("Failed to canonicalize target path: {}", e))?
    } else {
        let parent = target_path
            .parent()
            .ok_or_else(|| "Target path has no parent directory".to_string())?;
        if parent.exists() {
            let canonical_parent = parent
                .canonicalize()
                .map_err(|e| format!("Failed to canonicalize target parent: {}", e))?;
            canonical_parent.join(target_path.file_name().unwrap())
        } else {
            return Err("Target parent directory does not exist".to_string());
        }
    };

    if !canonical_target.starts_with(&canonical_root) {
        return Err("Access denied: Path is outside workspace directory".to_string());
    }

    Ok(canonical_target)
}

/// Atomically write content to a file:
/// Write to a unique temporary file in the same directory, flush/sync, then rename over the destination.
pub fn atomic_write_file(path: &Path, content: &str) -> io::Result<()> {
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(parent)?;

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document");
    let temp_name = format!(".{}.{}.tmp", file_name, Uuid::new_v4());
    let temp_path = parent.join(temp_name);

    {
        let mut file = File::create(&temp_path)?;
        file.write_all(content.as_bytes())?;
        file.sync_all()?;
    }

    // Atomic replace
    fs::rename(&temp_path, path)?;
    Ok(())
}

/// Read text file as UTF-8 string
pub fn read_file_string(path: &Path) -> io::Result<String> {
    fs::read_to_string(path)
}
