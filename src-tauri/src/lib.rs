mod commands;
mod fs_utils;
pub mod models;
pub mod operations;
pub mod tree;
mod watcher;
pub mod welcome;
mod workspace;

use std::sync::{Arc, Mutex};
use watcher::{WatcherState, WorkspaceWatcher};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let watcher_state: WatcherState = Arc::new(Mutex::new(WorkspaceWatcher::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(watcher_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_last_workspace,
            commands::set_last_workspace,
            commands::scan_workspace,
            commands::read_document,
            commands::write_document,
            commands::create_new_page,
            commands::create_new_subpage,
            commands::rename_page,
            commands::delete_page,
            commands::save_image,
            commands::start_watch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
