# Enable real "Sign in with Google" (your actual accounts)

Today the sign-in shows a **demo** account chooser. To make it show the user's **real**
Google accounts (Google Identity Services / One Tap), you need an **OAuth Client ID**.
The code hook is already wired — this is the only setup needed. ~10 minutes.

> You do these steps (they need *your* Google account); I can't create accounts for you.

## 1. Create a Google Cloud project
1. Go to **https://console.cloud.google.com/** and sign in.
2. Top bar → project dropdown → **New Project** → name it `CardIQ` → **Create**.

## 2. Configure the OAuth consent screen
1. Left menu → **APIs & Services → OAuth consent screen**.
2. User type: **External** → **Create**.
3. Fill: App name `CardIQ`, user support email (yours), developer contact email.
4. **Scopes** — add only `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
   (basic profile — **no Gmail/restricted scopes**, so no security audit needed).
5. **Test users** — add your email while in "Testing". Publish later to go live for everyone.

## 3. Create the OAuth Client ID
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins** — add every origin the app is served from, e.g.:
   - `https://cardiq.app`
   - `http://localhost:4321` (local dev)
4. (Redirect URIs aren't needed for the GIS button/One-Tap flow we use.)
5. **Create** → copy the **Client ID** (looks like `1234567890-abc123.apps.googleusercontent.com`).

## 4. Drop it into the app
In [web/login.html](web/login.html), set the constant near the top of the `<script>`:
```js
var GOOGLE_CLIENT_ID = "1234567890-abc123.apps.googleusercontent.com";
```
That's it. On load the app fetches Google Identity Services and `startGoogle()` calls the
**real** Google chooser/One-Tap — the demo sheet is bypassed automatically. The callback
already decodes the ID token and signs the user in (`finishSignIn`).

## 5. (Recommended) move the secret server-side later
The Client ID is public (fine in client code). When you add a backend, **verify the returned
ID token server-side** (Google's tokeninfo / a JWT library) before creating a session — so the
session is trustworthy, not just client-asserted.

## Notes
- **Cost: free.** Basic sign-in (email + profile) needs no paid audit.
- **No Gmail reading** — we only request name/email. Reading inbox would need restricted scopes
  + a CASA security audit ($$$); we deliberately don't.
- Until the Client ID is set, the demo chooser (with the inline "use another account" form)
  keeps the flow working for development and screenshots.
