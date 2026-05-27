// Tauri application entry point for library mode.
// The `run()` function is called from main.rs (desktop) or mobile entry points.

mod deeplink;

use tauri_plugin_deep_link::DeepLinkExt;
use tracing::info;

/// Builds and runs the Tauri application.
///
/// Registers all plugins and sets up the deep-link handler for
/// the `pragna://` custom protocol used by Auth0 social login callbacks.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialise tracing subscriber — respects RUST_LOG env var.
    // Falls back to INFO level if RUST_LOG is not set.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    info!("app:boot:start");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Register the deep-link handler.
            // When Auth0 redirects to pragna://auth/callback?code=...
            // the OS delivers it here and we emit a JS-visible event.
            deeplink::register(app)?;
            info!("app:setup:complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Pragna");
}
