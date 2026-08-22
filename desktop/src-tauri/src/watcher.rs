use notify::{Event, EventKind, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// A single filesystem write (e.g. saving a downloaded file) typically fires
/// both a Create and a Modify event in quick succession. This window
/// collapses those into a single "file-detected" emission per path.
const DEBOUNCE_WINDOW: Duration = Duration::from_millis(500);

#[derive(Clone, serde::Serialize)]
struct DetectedFile {
    path: String,
    mime_type: Option<String>,
}

/// Starts watching the user's Downloads folder for new files, emitting a
/// "file-detected" event to the frontend for each one found.
///
/// Runs on its own background thread so it doesn't block the Tauri event
/// loop. The `notify::Watcher` must stay alive for the duration of the
/// watch, so it's kept alive by leaking it onto this thread's stack via an
/// infinite park loop (the whole point of this thread is to watch forever).
pub fn start(app_handle: AppHandle) {
    let downloads_dir = match dirs::download_dir() {
        Some(dir) => dir,
        None => {
            log::error!("Could not resolve the Downloads folder; watcher not started");
            return;
        }
    };

    std::thread::spawn(move || {
        let handle = app_handle.clone();
        let mut last_seen: HashMap<PathBuf, Instant> = HashMap::new();

        let mut watcher = match notify::recommended_watcher(move |res: notify::Result<Event>| {
            let event = match res {
                Ok(event) => event,
                Err(err) => {
                    log::error!("Watch error: {err}");
                    return;
                }
            };

            // Only care about files actually finishing a create/write, not
            // every intermediate event a copy operation fires.
            if !matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) {
                return;
            }

            for path in event.paths {
                if !path.is_file() {
                    continue;
                }

                let now = Instant::now();
                if let Some(last) = last_seen.get(&path) {
                    if now.duration_since(*last) < DEBOUNCE_WINDOW {
                        continue;
                    }
                }
                last_seen.insert(path.clone(), now);

                let mime_type = mime_guess::from_path(&path)
                    .first()
                    .map(|m| m.essence_str().to_string());

                log::info!(
                    "Detected file in Downloads: {} ({})",
                    path.display(),
                    mime_type.as_deref().unwrap_or("unknown type")
                );
                let _ = handle.emit(
                    "file-detected",
                    DetectedFile {
                        path: path.display().to_string(),
                        mime_type,
                    },
                );
            }
        }) {
            Ok(watcher) => watcher,
            Err(err) => {
                log::error!("Failed to create watcher: {err}");
                return;
            }
        };

        if let Err(err) = watcher.watch(&downloads_dir, RecursiveMode::NonRecursive) {
            log::error!("Failed to watch {}: {err}", downloads_dir.display());
            return;
        }

        log::info!("Watching {} for new files", downloads_dir.display());

        // Park this thread forever; the watcher lives in this closure's
        // scope and must not be dropped for watching to continue.
        loop {
            std::thread::park();
        }
    });
}
