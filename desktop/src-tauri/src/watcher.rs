use notify::{Event, EventKind, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// A single filesystem write (e.g. saving a downloaded file) typically fires
/// both a Create and a Modify event in quick succession. This window
/// collapses those into a single "file-detected" emission per path.
const DEBOUNCE_WINDOW: Duration = Duration::from_millis(500);

/// Never swept up, no exceptions: installers, archives, and in-progress
/// download markers aren't finished documents. The download-marker suffixes
/// (crdownload/part/download/opdownload/partial) matter in practice, not
/// just in theory — Chrome/Edge write to "name.pdf.crdownload" while
/// downloading and briefly leave stray ".tmp" staging files alongside it;
/// without this both got swept up as garbage documents in real testing.
const BLOCKED_EXTENSIONS: &[&str] = &[
    "exe", "msi", "bat", "cmd", "ps1", "dmg", "app", "zip", "rar", "7z", "tar", "gz",
    "crdownload", "part", "download", "opdownload", "partial", "tmp",
];

/// Best-effort filename classification. There's no reliable pre-upload
/// signal beyond the filename (OCR only runs after upload), so this is a
/// keyword heuristic, not a guarantee — a file named e.g.
/// "results_notes_final.pdf" would misfire as Notes. Good enough to let
/// the user gate the bulk-download category behind a toggle; not a
/// substitute for real content classification.
const NOTES_ASSIGNMENTS_KEYWORDS: &[&str] = &[
    "note", "notes", "lecture", "slide", "slides", "module", "unit", "syllabus", "chapter",
    "assignment", "assign", "homework", "hw", "lab", "submission",
];

#[derive(Clone, serde::Serialize)]
struct DetectedFile {
    path: String,
    mime_type: Option<String>,
    /// "notes_assignments" or "general" — see NOTES_ASSIGNMENTS_KEYWORDS.
    category: String,
}

fn is_blocked(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| BLOCKED_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn classify(path: &std::path::Path) -> &'static str {
    let filename = path
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or_default()
        .to_lowercase();

    if NOTES_ASSIGNMENTS_KEYWORDS
        .iter()
        .any(|kw| filename.contains(kw))
    {
        "notes_assignments"
    } else {
        "general"
    }
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

                if is_blocked(&path) {
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
                let category = classify(&path);

                log::info!(
                    "Detected file in Downloads: {} ({}, {})",
                    path.display(),
                    mime_type.as_deref().unwrap_or("unknown type"),
                    category
                );
                let _ = handle.emit(
                    "file-detected",
                    DetectedFile {
                        path: path.display().to_string(),
                        mime_type,
                        category: category.to_string(),
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
