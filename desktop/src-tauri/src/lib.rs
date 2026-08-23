mod watcher;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Must be the first plugin registered: it needs to intercept startup
    // before anything else runs. Without this, every launch (Start Menu
    // search, double-click, etc.) spawns its own process with its own
    // tray icon and its own watcher thread — confusing, and risky since
    // multiple watcher instances could double-process the same file.
    // When a second launch is detected, this hands off to the already-
    // running instance (which shows/focuses its window) and the new
    // process exits immediately instead of continuing to start up.
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
      }
    }))
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      watcher::start(app.handle().clone());

      // The watcher only runs while this process is alive — closing the
      // window must not kill the process, or "background" watching stops
      // the moment the window closes. Tray icon gives a way back in (or
      // to actually quit) once the window is hidden rather than closed.
      let show_item = MenuItem::with_id(app, "show", "Show DocVault", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

      TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "quit" => app.exit(0),
          _ => {}
        })
        .build(app)?;

      if let Some(window) = app.get_webview_window("main") {
        let window_clone = window.clone();
        window.on_window_event(move |event| {
          if let WindowEvent::CloseRequested { api, .. } = event {
            let _ = window_clone.hide();
            api.prevent_close();
          }
        });
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
