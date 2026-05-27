# Login Feature — QA Test Scenarios

**Application:** Pragna Desktop (Tauri v2)
**Feature:** Login Page (email/password + social login via Auth0)
**Audience:** QA engineers with no prior knowledge of the application.

---

## Environment Setup (do once before all tests)

1. Install the Pragna desktop app on your machine (macOS or Windows).
2. Copy `.env.example` to `.env.local` in the project root and fill in:
   - `VITE_AUTH0_DOMAIN` — your Auth0 tenant domain
   - `VITE_AUTH0_CLIENT_ID` — the Auth0 application client ID
   - `VITE_AUTH0_AUDIENCE` — the API audience URL
   - `VITE_API_BASE_URL` — the running FastAPI backend URL (e.g. `http://localhost:8000`)
3. In the Auth0 dashboard, ensure `pragna://auth/callback` is registered under
   **Application → Allowed Callback URLs**.
4. Have at least one test user account ready in Auth0 (email + password).

---

## TC-001: Login page renders on fresh launch

**Preconditions / Setup**
- App is freshly installed, no previous session.
- No `.env.local` entry for a stored token.

**Act**
1. Launch the Pragna desktop app.

**Assert**
- The app displays the login page (`/#/login`).
- The page shows the app name "Pragna" as a heading.
- An "Email address" input field is visible.
- A "Password" input field is visible (text is masked by default).
- A "Sign in" button is visible.
- An "or" divider is visible.
- A "No account? Create one" link is visible.
- No error banner is shown.

---

## TC-002: Social login buttons load dynamically from Auth0

**Preconditions / Setup**
- Auth0 tenant has at least one social connection enabled (e.g. Google).
- App is on the login page (TC-001 setup).
- Device has internet access.

**Act**
1. Wait up to 5 seconds after the login page loads.

**Assert**
- One or more social login buttons appear below the "or" divider.
- Each button label reads "Sign in with [Provider Name]" (e.g. "Sign in with Google").
- The "Loading sign-in options…" text is no longer visible.

---

## TC-003: Email/password login with valid credentials

**Preconditions / Setup**
- A valid test user exists in Auth0 (email + password).
- App is on the login page.

**Act**
1. Enter the test user's email in the "Email address" field.
2. Enter the test user's password in the "Password" field.
3. Click "Sign in".

**Assert**
- The "Sign in" button shows a spinner and reads "Signing in…" while the request is in flight.
- After a successful response (typically < 3 seconds), the app navigates to the Settings page (`/#/settings`).
- The login page is no longer visible.
- No error banner is shown.

**Teardown**
- (Optional) Log out to reset to guest state for subsequent tests.

---

## TC-004: Email/password login with invalid credentials

**Preconditions / Setup**
- App is on the login page.

**Act**
1. Enter a valid email address format (e.g. `wrong@example.com`).
2. Enter an incorrect password (e.g. `badpassword`).
3. Click "Sign in".

**Assert**
- An error banner appears below the app name with the message:
  `"Invalid email or password."`
- The alert icon (⚠) is visible inside the banner.
- The "Sign in" button returns to its normal state (no spinner).
- The app stays on the login page.

---

## TC-005: Login blocked when fields are empty

**Preconditions / Setup**
- App is on the login page.
- Both email and password fields are empty.

**Act**
1. Click "Sign in" without entering any values.

**Assert**
- An error banner appears with the message: `"Email and password are required."`
- No network request is made (verify by checking that the "Signing in…" spinner never appears).
- The app stays on the login page.

---

## TC-006: Password show/hide toggle

**Preconditions / Setup**
- App is on the login page.

**Act**
1. Enter any text in the "Password" field.
2. Click the eye icon (👁) on the right side of the password field.

**Assert**
- The entered text becomes visible (field switches from masked to plain text).
- The icon changes to a crossed eye (👁‍🗨 or similar "hide" icon).

**Act (continued)**
3. Click the icon again.

**Assert**
- The text is masked again.

---

## TC-007: Social login — system browser opens

**Preconditions / Setup**
- At least one social login button is visible (TC-002 prerequisite).
- App is on the login page.

**Act**
1. Click "Sign in with Google" (or any visible social button).

**Assert**
- The system default browser opens (not a tab inside the Pragna window).
- The URL in the browser starts with `https://<auth0-tenant>.auth0.com/authorize`.
- The Pragna desktop window is still visible and shows a "Completing sign-in…" spinner on the callback route (`/#/auth-callback`).

---

## TC-008: Social login — successful callback completes sign-in

**Preconditions / Setup**
- Completed TC-007 (system browser is open at Auth0 authorize page).
- A test user exists with the social provider account (e.g. a Google account).

**Act**
1. In the system browser, complete the Auth0 login flow with the social account.
2. Auth0 redirects to `pragna://auth/callback?code=...&state=...`.

**Assert**
- The system browser closes (or redirects away from Auth0).
- The Pragna desktop app comes back into focus.
- The spinner disappears and the app navigates to the Settings page (`/#/settings`).
- The login page is no longer visible.

---

## TC-009: Social login — user cancels in browser

**Preconditions / Setup**
- Completed TC-007 (system browser is open).

**Act**
1. Close the system browser without completing the login.

**Assert**
- The Pragna app remains on the callback route with the spinner.
- After approximately 60 seconds (timeout — if implemented), the app navigates back to the login page. *(Note: timeout behavior is a TODO in the current build — record the actual behavior observed.)*
- No error message is shown for a user-cancelled flow.

---

## TC-010: "Create one" link navigates to Register page

**Preconditions / Setup**
- App is on the login page.

**Act**
1. Click the "Create one" link.

**Assert**
- The app navigates to the register page (`/#/register`).
- The register page renders without errors.

*(Note: the Register page is a stub in the current build — verify no crash occurs.)*

---

## TC-011: Authenticated user is redirected away from login

**Preconditions / Setup**
- A user has previously logged in successfully (TC-003).
- Tokens are stored in the Tauri store (app was not logged out).

**Act**
1. Close and relaunch the app.

**Assert**
- The app does NOT show the login page.
- The app navigates directly to the Settings page (`/#/settings`).

---

## TC-012: All inputs and buttons are keyboard-accessible

**Preconditions / Setup**
- App is on the login page.

**Act**
1. Press `Tab` repeatedly without using the mouse.

**Assert**
- Focus moves in order: Email field → Password field → Show/hide toggle → Sign in button → Social login buttons → "Create one" link.
- Each focused element has a visible focus ring.
- Pressing `Enter` while the Sign in button is focused submits the form.
