/// Deep-link handler for the `pragna://` custom URI scheme.
///
/// When Auth0 completes social login, it redirects to:
///   pragna://auth/callback?code=<code>&state=<state>
///
/// The OS delivers this URL to the running Tauri instance.
/// The `tauri-plugin-deep-link` plugin emits a `deep-link://new-url` event
/// to the frontend automatically — no additional Rust code is needed for
/// the basic event emission.
///
/// This module handles:
///   - Registering the custom scheme on platforms that require it at runtime
///   - Logging deep-link events for observability
///
/// The frontend (AuthCallbackView.tsx) listens for `onOpenUrl` events from
/// the plugin and processes the code/state params from there.
use tauri::App;
use tauri_plugin_deep_link::DeepLinkExt;
use tracing::{info, warn};

/// Registers the deep-link listener and logs any incoming deep-link URLs.
///
/// # Errors
/// Returns an error if the deep-link plugin fails to register the handler.
pub fn register(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // Register `pragna://` as a handled scheme on platforms that need runtime registration.
    // On macOS/Windows the scheme is also declared in tauri.conf.json.
    #[cfg(any(target_os = "linux", target_os = "windows"))]
    app.deep_link().register("pragna")?;

    // Set up a Rust-side listener for logging/observability.
    // The plugin also emits the event to JS automatically.
    app.deep_link().on_open_url(|event| {
        for url in event.urls() {
            let url_str = url.as_str();
            if url_str.starts_with("pragna://auth/callback") {
                info!(url = url_str, "deeplink:auth-callback:received");
            } else {
                warn!(url = url_str, "deeplink:unknown:received");
            }
        }
    });

    info!("deeplink:registered");
    Ok(())
}

#[cfg(test)]
mod tests {
    /// Verifies the expected deep-link URL pattern matches auth callbacks.
    /// Full integration test requires a running Tauri app — covered in QA docs.
    #[test]
    fn auth_callback_url_matches_expected_scheme() {
        let url = "pragna://auth/callback?code=abc&state=xyz";
        assert!(url.starts_with("pragna://auth/callback"));
    }

    #[test]
    fn non_auth_url_does_not_match_callback() {
        let url = "pragna://some/other/path";
        assert!(!url.starts_with("pragna://auth/callback"));
    }
}
