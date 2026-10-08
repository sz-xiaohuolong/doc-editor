use std::fs;
use std::path::PathBuf;
use crate::models::AppConfig;

fn get_config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("doc-editor").join("config.json"))
}

pub fn load_config() -> AppConfig {
    if let Some(path) = get_config_path() {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(path) {
                if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                    return config;
                }
            }
        }
    }
    AppConfig { last_workspace: None }
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = get_config_path().ok_or_else(|| "Failed to get config directory".to_string())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())?;
    Ok(())
}
