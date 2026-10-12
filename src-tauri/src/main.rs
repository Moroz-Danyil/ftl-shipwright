// No console window next to the app in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ftl_shipwright_lib::run()
}
