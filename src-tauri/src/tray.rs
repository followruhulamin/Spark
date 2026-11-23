use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

/// Shows, unminimizes, and focuses the main application window,
/// bringing it to the front even if Spark is currently in the background.
#[allow(deprecated)]
pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        #[cfg(target_os = "macos")]
        {
            use cocoa::appkit::NSApplication;
            unsafe {
                let ns_app = cocoa::appkit::NSApp();
                ns_app.activateIgnoringOtherApps_(cocoa::base::YES);
            }
        }
    }
}

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let icon_bytes = include_bytes!("../icons/tray_icon.png");
    let tray_icon = Image::from_bytes(icon_bytes)?;

    let open_item = MenuItem::with_id(app, "open", "Open Spark", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let restart_item = MenuItem::with_id(app, "restart", "Restart Server & Services", true, None::<&str>)?;
    let stop_item = MenuItem::with_id(app, "stop", "Stop Server & Services", true, None::<&str>)?;
    let start_item = MenuItem::with_id(app, "start", "Start Server & Services", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Spark", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open_item,
            &sep1,
            &restart_item,
            &stop_item,
            &start_item,
            &sep2,
            &quit_item,
        ],
    )?;

    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(tray_icon)
        .tooltip("Spark - macOS Local PHP/Laravel Environment")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "open" => {
                    show_main_window(app);
                }
                "restart" => {
                    let _ = app.emit("tray-action", "restart_all");
                }
                "stop" => {
                    let _ = app.emit("tray-action", "stop_all");
                }
                "start" => {
                    let _ = app.emit("tray-action", "start_all");
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
