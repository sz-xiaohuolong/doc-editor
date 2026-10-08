use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct WorkspaceWatcher {
    _watcher: Option<RecommendedWatcher>,
    watching_path: Option<PathBuf>,
}

impl WorkspaceWatcher {
    pub fn new() -> Self {
        Self {
            _watcher: None,
            watching_path: None,
        }
    }
}

pub type WatcherState = Arc<Mutex<WorkspaceWatcher>>;

pub fn start_watching(app_handle: AppHandle, workspace_path: &Path, state: &WatcherState) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;

    // Drop previous watcher if exists
    guard._watcher = None;
    guard.watching_path = Some(workspace_path.to_path_buf());

    let (tx, rx) = channel::<Result<Event, notify::Error>>();
    let mut watcher = RecommendedWatcher::new(tx, Config::default()).map_err(|e| e.to_string())?;

    watcher
        .watch(workspace_path, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    guard._watcher = Some(watcher);

    let handle_clone = app_handle.clone();
    let root = workspace_path.to_path_buf();

    thread::spawn(move || {
        let mut last_event_time = Instant::now();
        let mut last_path: Option<PathBuf> = None;

        while let Ok(res) = rx.recv() {
            if let Ok(event) = res {
                for path in event.paths {
                    // Ignore temp files, hidden files, or assets
                    if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                        if file_name.starts_with('.') || file_name.ends_with(".tmp") || file_name == "assets" {
                            continue;
                        }
                    }

                    // 300ms debounce per path
                    let now = Instant::now();
                    if let Some(ref prev_path) = last_path {
                        if prev_path == &path && now.duration_since(last_event_time) < Duration::from_millis(300) {
                            continue;
                        }
                    }

                    last_path = Some(path.clone());
                    last_event_time = now;

                    let relative_path = path
                        .strip_prefix(&root)
                        .unwrap_or(&path)
                        .to_string_lossy()
                        .to_string();

                    let _ = handle_clone.emit("workspace-file-changed", relative_path);
                }
            }
        }
    });

    Ok(())
}
