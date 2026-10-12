mod commands;

use commands::dat_archive::{pkg_list_entries, pkg_read_entry};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![pkg_list_entries, pkg_read_entry])
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
