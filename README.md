# per.bio (A portfolio builder)

A lightweight portfolio-builder for college students — no build step, no backend. Open it in VS Code and it just runs in the browser.

## Files

- `index.html` — onboarding: pick a username, then answer 3 quick questions (goal, age range, field)
- `dashboard.html` — the editor: left tab rail (Profile, Socials, Media, Resume/CV, About Me, Contact Info, Booking) with a live preview on the right
- `profile.html` — the actual public page a viewer would see
- `style.css` — the whole design system (colors, type, layout)
- `script.js` — all the logic: state management, onboarding flow, editor, and the public-page renderer

## Run it

No install needed. Easiest option:

1. Open this folder in VS Code
2. Install the **Live Server** extension (if you don't have it)
3. Right-click `index.html` → **Open with Live Server**

Or just double-click `index.html` to open it directly in a browser (works fine, though file uploads behave slightly better served over `http://` than `file://`).

## How data is stored right now

Everything is saved to the browser's `localStorage` under the key `perbio_state` — that's why it's all "same template" and single-user for now, exactly as you described. There's no server yet, so:

- Data is per-browser, not shared across devices
- "Start over" in the dashboard top bar wipes it and sends you back to onboarding
- The uploaded resume/avatar are stored as base64 in `localStorage`, so keep files reasonably small (a couple MB) — this is a placeholder for real file storage later

## Where to take this next

- **Templates**: `dashboard.html`/`profile.html` currently render one layout. To add templates, branch `renderPublicMarkup()` in `script.js` on a `state.profile.template` field and swap in alternate markup/CSS per template.
- **Real accounts**: swap `localStorage` for a backend (e.g. Supabase, Firebase, or your own API) — the state shape in `defaultState()` in `script.js` is the schema to persist.
- **Username availability**: right now any username is accepted locally; hook `validateUsername()` in `script.js` up to a real API call to check for collisions.
- **Icons**: platform badges are currently colored initials (FB, IG, TT…) to keep this dependency-free — swap in real SVG icons whenever you're ready.
