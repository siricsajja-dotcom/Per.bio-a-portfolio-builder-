# Per.bio (A portfolio builder)

**A clean, personal bio and portfolio page for college students.** Show your socials, media, resume, story, and availability in one link, built for job and grad school applications.

per.bio walks a student through claiming a username and answering a few quick questions, then gives them an editor and a polished public page to share with recruiters and admissions officers.

## Features

- **Guided onboarding**: claim a username, then answer three quick questions (goal, age range, field of interest)
- **Editor with live preview**: edit on the left, watch your public page update on the right
- **Profile**: name, photo, and a one-line tagline
- **Tabbed public page**:
  - **Socials**: Facebook, Instagram, TikTok, Snapchat, Pinterest, YouTube, LinkedIn, Handshake, X
  - **Media**: YouTube, TikTok, and Vimeo links
  - **Resume / CV**: upload a file or link to one
  - **About Me**: the longer story
  - **Contact Info**: email, phone, location
  - **Booking**: a calendar linked to your Gmail, with your chosen days, hours, and slot length. Visitors pick a time and book
- **Zero dependencies**: plain HTML, CSS, and JavaScript. No build step

## Getting started

1. Clone the repo:
   ```
   git clone https://github.com/YOUR-USERNAME/per-bio.git
   cd per-bio
   ```
2. Open the folder in VS Code.
3. Install the **Live Server** extension, then right-click `index.html` and choose **Open with Live Server**.

You can also double-click `index.html` to open it directly in a browser, though file uploads work more reliably over `http://` (Live Server) than `file://`.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Onboarding: username and the three questions |
| `dashboard.html` | Editor with tab rail and live preview |
| `profile.html` | The public-facing portfolio page |
| `style.css` | Design system (colors, type, layout, calendar) |
| `script.js` | State, onboarding flow, editor logic, page and calendar rendering |

## How it works

All data is stored in the browser's `localStorage` under the key `perbio_state`. The state shape is defined in `defaultState()` in `script.js`. Every user currently gets the same page template.

- Data is per-browser and per-device, since there is no server yet
- **Start over** in the dashboard top bar clears everything and returns to onboarding
- Uploaded photos and resumes are stored as base64, so keep files small (a couple of MB)

## Current limitations

- **Gmail booking is simulated.** Connecting Gmail stores the email address and generates a calendar from your chosen days and hours. It does not call the Google Calendar API or send real invites yet.
- **No accounts or hosting.** Usernames are not checked for uniqueness and pages are not shared between devices.
- **Social icons** are colored initials (FB, IG, TT...) to stay dependency-free.

## Roadmap

- [ ] Multiple page templates (branch `renderPublicMarkup()` on a template field)
- [ ] Real accounts and storage (e.g. Supabase or Firebase)
- [ ] Google Calendar API integration for live availability and real invites
- [ ] Username availability checks
- [ ] Real SVG brand icons
- [ ] Embedded video previews for YouTube, TikTok, and Vimeo

## Design

An editorial, academic feel: deep ink and warm paper tones with a single brass accent, Fraunces for headings and Inter for body text, and hairline rules instead of heavy card shadows.
