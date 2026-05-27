/**
 * API and application-level constants.
 *
 * All VITE_API_* env reads are centralised here.
 */

/** Display name shown in the UI. */
export const APP_NAME = 'Pragna';

/**
 * Base URL for the FastAPI backend.
 * Option A: user runs FastAPI externally and sets VITE_API_BASE_URL.
 * Option B (sidecar): Rust layer starts FastAPI and emits the port via a
 *   Tauri event; the dynamic URL overrides this default at runtime.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
