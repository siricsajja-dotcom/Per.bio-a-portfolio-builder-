/* =========================================================
   per.bio — shared logic
   Single source of truth in localStorage, three pages:
   index.html (onboarding) -> dashboard.html (editor) -> profile.html (public page)
   ========================================================= */

const STORAGE_KEY = "perbio_state";

const SOCIAL_PLATFORMS = [
  { key: "facebook",  label: "Facebook",  initials: "FB", color: "#3B5998" },
  { key: "instagram", label: "Instagram", initials: "IG", color: "#C1367B" },
  { key: "tiktok",    label: "TikTok",    initials: "TT", color: "#111111" },
  { key: "snapchat",  label: "Snapchat",  initials: "SC", color: "#B8A400" },
  { key: "pinterest", label: "Pinterest", initials: "PT", color: "#C8232C" },
  { key: "youtube",   label: "YouTube",   initials: "YT", color: "#C4302B" },
  { key: "linkedin",  label: "LinkedIn",  initials: "IN", color: "#0A66C2" },
  { key: "handshake", label: "Handshake", initials: "HS", color: "#2F6F62" },
  { key: "x",         label: "X",         initials: "X",  color: "#111111" },
];

const MEDIA_PLATFORMS = ["YouTube", "TikTok", "Vimeo"];

const TEMPLATES = [
  { id: "classic",   name: "Classic",   desc: "Warm paper, centered",            bg: "#F7F5F1", dark: false },
  { id: "midnight",  name: "Midnight",  desc: "Dark and confident",              bg: "#12181F", dark: true  },
  { id: "editorial", name: "Editorial", desc: "Left-aligned, big serif name",    bg: "#FFFFFF", dark: false },
  { id: "banner",    name: "Banner",    desc: "Color header behind your photo",  bg: "#F7F5F1", dark: false },
  { id: "split",     name: "Split",     desc: "Profile left, content right",     bg: "#F7F5F1", dark: false },
];

const ACCENTS = ["#C99A3B", "#2F6F62", "#3B5B8C", "#B3452E", "#7A4E9C", "#1B2430"];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function pad2(n) { return String(n).padStart(2, "0"); }
function dateKey(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function todayKey() { const t = new Date(); return dateKey(t.getFullYear(), t.getMonth(), t.getDate()); }

function formatTime12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return `${h12}:${pad2(m)} ${ampm}`;
}

function getSlotsForDate(booking, y, m, d) {
  const key = dateKey(y, m, d);
  const wd = WEEKDAYS[new Date(y, m, d).getDay()];
  if (!booking.daysAvailable.includes(wd)) return [];
  if (key < todayKey()) return [];
  const now = new Date();
  const nowMinutesToday = key === todayKey() ? now.getHours() * 60 + now.getMinutes() : -1;
  const slots = [];
  const step = booking.slotMinutes;
  for (let mins = booking.startHour * 60; mins < booking.endHour * 60; mins += step) {
    if (key === todayKey() && mins <= nowMinutesToday) continue;
    const time = `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
    const bookedEntry = (booking.bookings || []).find((b) => b.date === key && b.time === time);
    slots.push({ time, label: formatTime12(time), booked: !!bookedEntry, bookedBy: bookedEntry ? bookedEntry.name : null });
  }
  return slots;
}

function buildCalendarHTML(state, viewYear, viewMonth, selectedKey) {
  const booking = state.profile.booking;
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const tKey = todayKey();

  let cells = "";
  for (let i = 0; i < firstDow; i++) cells += `<div class="cal-day cal-blank"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(viewYear, viewMonth, d);
    const isPast = key < tKey;
    const slots = !isPast ? getSlotsForDate(booking, viewYear, viewMonth, d) : [];
    const hasOpen = slots.some((s) => !s.booked);
    const classes = ["cal-day"];
    if (isPast) classes.push("cal-past");
    if (key === tKey) classes.push("cal-today");
    if (hasOpen) classes.push("cal-available");
    if (key === selectedKey) classes.push("cal-selected");
    cells += `<button type="button" class="${classes.join(" ")}" data-daykey="${hasOpen ? key : ""}" ${hasOpen ? "" : "disabled"}>${d}</button>`;
  }

  const canPrev = !(viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth());

  let slotsHtml = "";
  if (selectedKey) {
    const [sy, sm, sd] = selectedKey.split("-").map(Number);
    const slots = getSlotsForDate(booking, sy, sm - 1, sd);
    slotsHtml = `
      <div class="cal-slots-wrap">
        <div class="cal-slots-label">${MONTH_NAMES[sm - 1]} ${sd} — open times</div>
        <div class="cal-slots">
          ${slots.length ? slots.map((s) => `
            <button type="button" class="cal-slot ${s.booked ? "cal-slot-booked" : ""}" data-slot-time="${s.time}" ${s.booked ? "disabled" : ""}>${s.label}${s.booked ? " · booked" : ""}</button>
          `).join("") : `<p class="pv-empty">No open times this day.</p>`}
        </div>
        <div id="calConfirmMount"></div>
      </div>
    `;
  }

  return `
    <div class="gmail-connected-badge">
      <span class="gmail-dot"></span><span>Synced with <strong>${escapeHtml(booking.gmailEmail || "Gmail")}</strong></span>
    </div>
    ${booking.note ? `<p class="cal-note">${escapeHtml(booking.note)}</p>` : ""}
    <div class="cal-header">
      <button type="button" class="btn-text" data-cal-nav="-1" ${canPrev ? "" : "disabled"}>‹</button>
      <div class="cal-month-label serif">${MONTH_NAMES[viewMonth]} ${viewYear}</div>
      <button type="button" class="btn-text" data-cal-nav="1">›</button>
    </div>
    <div class="cal-weekdays">${WEEKDAYS.map((w) => `<div>${w[0]}</div>`).join("")}</div>
    <div class="cal-grid">${cells}</div>
    ${slotsHtml}
  `;
}

function initCalendar(mountEl, state, save) {
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  let selectedKey = null;

  function draw() {
    mountEl.innerHTML = buildCalendarHTML(state, viewYear, viewMonth, selectedKey);
    wire();
  }

  function wire() {
    mountEl.querySelectorAll("[data-cal-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = +btn.getAttribute("data-cal-nav");
        viewMonth += dir;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        selectedKey = null;
        draw();
      });
    });
    mountEl.querySelectorAll("[data-daykey]").forEach((btn) => {
      const key = btn.getAttribute("data-daykey");
      if (!key) return;
      btn.addEventListener("click", () => { selectedKey = key; draw(); });
    });
    mountEl.querySelectorAll("[data-slot-time]").forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener("click", () => showConfirmForm(btn.getAttribute("data-slot-time")));
    });
  }

  function showConfirmForm(time) {
    const mount = mountEl.querySelector("#calConfirmMount");
    if (!mount) return;
    mount.innerHTML = `
      <div class="cal-confirm">
        <div class="field"><label>Your name</label><input type="text" id="calName" placeholder="Full name"></div>
        <div class="field"><label>Your email</label><input type="email" id="calEmail" placeholder="you@email.com"></div>
        <button type="button" class="btn btn-primary btn-sm" id="calConfirmBtn">Confirm ${formatTime12(time)}</button>
      </div>
    `;
    mount.querySelector("#calConfirmBtn").addEventListener("click", () => {
      const name = mount.querySelector("#calName").value.trim();
      const email = mount.querySelector("#calEmail").value.trim();
      if (!name || !email) {
        if (!mount.querySelector(".field-msg")) {
          mount.querySelector(".cal-confirm").insertAdjacentHTML("beforeend", `<div class="field-msg error">Add your name and email to confirm.</div>`);
        }
        return;
      }
      state.profile.booking.bookings = state.profile.booking.bookings || [];
      state.profile.booking.bookings.push({ date: selectedKey, time, name, email, bookedAt: new Date().toISOString() });
      save();
      mount.innerHTML = `<div class="cal-confirm-success">Booked for ${formatTime12(time)}. A calendar invite would be sent via ${escapeHtml(state.profile.booking.gmailEmail || "Gmail")}.</div>`;
      setTimeout(draw, 1000);
    });
  }

  draw();
}

function mountCalendarIfNeeded(root, state, save) {
  if (!state.profile.booking.gmailConnected) return;
  const mount = root.querySelector("[data-cal-mount]");
  if (!mount) return;
  initCalendar(mount, state, save);
}

const GOALS = [
  "Job applications",
  "Grad school & higher ed",
  "Internships",
  "Building my personal brand",
];

const AGE_RANGES = ["16–18", "19–21", "22–24", "25+"];

const FIELDS = [
  "Business & Finance",
  "Tech & Engineering",
  "Health & Medicine",
  "Arts & Design",
  "Education",
  "Law & Policy",
  "Science & Research",
  "Other",
];

function defaultState() {
  return {
    username: "",
    onboardingComplete: false,
    answers: { goal: "", age: "", field: "" },
    profile: {
      template: "classic",
      accent: "",
      name: "",
      avatar: "",
      tagline: "",
      about: "",
      socials: {},
      media: [],
      resume: { fileName: "", fileData: "", link: "" },
      contact: { email: "", phone: "", location: "" },
      booking: {
        gmailConnected: false,
        gmailEmail: "",
        note: "",
        daysAvailable: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        startHour: 9,
        endHour: 17,
        slotMinutes: 30,
        bookings: [],
      },
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // shallow-merge to survive future field additions
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      answers: { ...base.answers, ...(parsed.answers || {}) },
      profile: {
        ...base.profile,
        ...(parsed.profile || {}),
        socials: { ...base.profile.socials, ...((parsed.profile || {}).socials || {}) },
        resume: { ...base.profile.resume, ...((parsed.profile || {}).resume || {}) },
        contact: { ...base.profile.contact, ...((parsed.profile || {}).contact || {}) },
        booking: { ...base.profile.booking, ...((parsed.profile || {}).booking || {}) },
      },
    };
  } catch (e) {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function withHttp(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/* =========================================================
   Renders the "public view" markup — used both by the live
   preview panel in dashboard.html and by profile.html.
   ========================================================= */
function renderPublicMarkup(state, opts = {}) {
  const p = state.profile;
  const compact = !!opts.compact;

  const avatarInner = p.avatar
    ? `<img src="${p.avatar}" alt="">`
    : initials(p.name || state.username);

  const socialChips = SOCIAL_PLATFORMS.filter((s) => p.socials[s.key])
    .map((s) => {
      const chipClass = compact ? "pv-social-chip" : "pv-social-chip";
      return `<a class="${chipClass}" style="background:${s.color}" href="${withHttp(p.socials[s.key])}" target="_blank" rel="noopener" title="${s.label}">${s.initials}</a>`;
    })
    .join("");

  const mediaHtml = p.media.length
    ? p.media.map((m) => `
        <div class="pv-media-card">
          <div class="plat">${escapeHtml(m.platform)}</div>
          <a href="${withHttp(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.title || m.url)}</a>
        </div>`).join("")
    : `<p class="pv-empty">No media added yet.</p>`;

  const resumeHtml = (p.resume.fileName || p.resume.link)
    ? `
      ${p.resume.fileName ? `<div class="pv-row"><span class="k">File</span><span>${escapeHtml(p.resume.fileName)}</span></div>` : ""}
      ${p.resume.link ? `<div class="pv-row"><span class="k">Link</span><a href="${withHttp(p.resume.link)}" target="_blank" rel="noopener">${escapeHtml(p.resume.link)}</a></div>` : ""}
      ${p.resume.fileData ? `<p style="margin-top:14px;"><a class="btn btn-outline btn-sm" href="${p.resume.fileData}" download="${escapeHtml(p.resume.fileName || "resume.pdf")}">Download resume</a></p>` : ""}
    `
    : `<p class="pv-empty">No resume uploaded yet.</p>`;

  const aboutHtml = p.about
    ? `<p style="white-space:pre-wrap;">${escapeHtml(p.about)}</p>`
    : `<p class="pv-empty">Nothing written yet.</p>`;

  const contactHtml = (p.contact.email || p.contact.phone || p.contact.location)
    ? `
      ${p.contact.email ? `<div class="pv-row"><span class="k">Email</span><a href="mailto:${escapeHtml(p.contact.email)}">${escapeHtml(p.contact.email)}</a></div>` : ""}
      ${p.contact.phone ? `<div class="pv-row"><span class="k">Phone</span><span>${escapeHtml(p.contact.phone)}</span></div>` : ""}
      ${p.contact.location ? `<div class="pv-row"><span class="k">Location</span><span>${escapeHtml(p.contact.location)}</span></div>` : ""}
    `
    : `<p class="pv-empty">No contact info yet.</p>`;

  const bookingHtml = p.booking.gmailConnected
    ? `<div class="cal-mount" data-cal-mount></div>`
    : `<p class="pv-empty">This page's calendar isn't connected yet.</p>`;

  const tpl = TEMPLATES.find((t) => t.id === p.template) || TEMPLATES[0];
  const accentStyle = p.accent ? ` style="--brass:${escapeHtml(p.accent)}"` : "";

  return `
    <div class="tpl tpl-${tpl.id}"${accentStyle}>
    <div class="tpl-layout">
    <div class="tpl-side">
    <div class="pv-head">
      <div class="pv-avatar">${avatarInner}</div>
      <h2 class="pv-name serif">${escapeHtml(p.name || state.username || "Your name")}</h2>
      ${p.tagline ? `<p class="pv-tag">${escapeHtml(p.tagline)}</p>` : ""}
      ${socialChips ? `<div class="pv-socials">${socialChips}</div>` : ""}
    </div>
    </div>
    <div class="tpl-main">
    <div class="pv-tabs" role="tablist">
      <button data-pv-tab="socials" class="active">Socials</button>
      <button data-pv-tab="media">Media</button>
      <button data-pv-tab="resume">Resume/CV</button>
      <button data-pv-tab="about">About</button>
      <button data-pv-tab="contact">Contact</button>
      <button data-pv-tab="booking">Booking</button>
    </div>
    <div class="pv-panel active" data-pv-panel="socials">
      ${socialChips ? `<p class="pv-empty">Tap an icon above to visit.</p>` : `<p class="pv-empty">No socials linked yet.</p>`}
    </div>
    <div class="pv-panel" data-pv-panel="media">${mediaHtml}</div>
    <div class="pv-panel" data-pv-panel="resume">${resumeHtml}</div>
    <div class="pv-panel" data-pv-panel="about">${aboutHtml}</div>
    <div class="pv-panel" data-pv-panel="contact">${contactHtml}</div>
    <div class="pv-panel" data-pv-panel="booking">${bookingHtml}</div>
    </div>
    </div>
    </div>
  `;
}

function wirePublicTabs(root) {
  const tabs = root.querySelectorAll("[data-pv-tab]");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-pv-tab");
      root.querySelectorAll("[data-pv-tab]").forEach((b) => b.classList.toggle("active", b === btn));
      root.querySelectorAll("[data-pv-panel]").forEach((p) =>
        p.classList.toggle("active", p.getAttribute("data-pv-panel") === target)
      );
    });
  });
}

/* =========================================================
   Page init — dispatched by data-page on <body>
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");
  if (page === "onboarding") initOnboarding();
  if (page === "dashboard") initDashboard();
  if (page === "profile") initProfile();
});

/* ---------------- onboarding (index.html) ---------------- */
function initOnboarding() {
  let state = loadState();
  if (state.onboardingComplete) {
    window.location.href = "dashboard.html";
    return;
  }

  const steps = ["username", "goal", "age", "field"];
  let stepIndex = 0;
  let draft = { username: state.username, goal: "", age: "", field: "" };

  const stepIndexEl = document.getElementById("stepIndex");
  const stepBody = document.getElementById("stepBody");
  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");

  function usernameStep() {
    return `
      <h1>Claim your page.</h1>
      <p class="onboard-sub">Pick the address people will find your portfolio at. You can't change this later.</p>
      <div class="field">
        <label for="usernameInput">Username</label>
        <div class="username-input-wrap">
          <span class="username-prefix">per.bio/</span>
          <input id="usernameInput" type="text" placeholder="firstname-lastname" autocomplete="off" value="${escapeHtml(draft.username)}">
        </div>
        <div class="field-msg" id="usernameMsg"></div>
      </div>
    `;
  }

  function choiceStep(title, sub, options, key) {
    return `
      <h1>${title}</h1>
      ${sub ? `<p class="onboard-sub">${sub}</p>` : `<div style="height:8px"></div>`}
      <div class="choice-list" id="choiceList">
        ${options.map((opt) => `
          <button type="button" class="choice ${draft[key] === opt ? "selected" : ""}" data-value="${escapeHtml(opt)}">
            <span>${escapeHtml(opt)}</span>
            <span class="tick"></span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function render() {
    const step = steps[stepIndex];
    stepIndexEl.textContent = `Step ${stepIndex + 1} of ${steps.length}`;

    if (step === "username") {
      stepBody.innerHTML = usernameStep();
      const input = document.getElementById("usernameInput");
      input.addEventListener("input", () => {
        draft.username = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
        input.value = draft.username;
        validateUsername();
      });
      input.focus();
      validateUsername();
    } else if (step === "goal") {
      stepBody.innerHTML = choiceStep("What's your goal for using per.bio?", "This just tailors a few defaults — you can change anything later.", GOALS, "goal");
      wireChoices("goal");
    } else if (step === "age") {
      stepBody.innerHTML = choiceStep("What's your age range?", "", AGE_RANGES, "age");
      wireChoices("age");
    } else if (step === "field") {
      stepBody.innerHTML = choiceStep("What field are you headed into?", "", FIELDS, "field");
      wireChoices("field");
    }

    backBtn.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    nextBtn.textContent = stepIndex === steps.length - 1 ? "Create my page" : "Continue";
    updateNextEnabled();
  }

  function wireChoices(key) {
    document.querySelectorAll(".choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        draft[key] = btn.getAttribute("data-value");
        document.querySelectorAll(".choice").forEach((b) => b.classList.toggle("selected", b === btn));
        updateNextEnabled();
      });
    });
  }

  function validateUsername() {
    const msg = document.getElementById("usernameMsg");
    if (!draft.username) {
      msg.textContent = "";
      msg.className = "field-msg";
    } else if (draft.username.length < 3) {
      msg.textContent = "Username must be at least 3 characters.";
      msg.className = "field-msg error";
    } else {
      msg.textContent = `Your page will live at per.bio/${draft.username}`;
      msg.className = "field-msg ok";
    }
    updateNextEnabled();
  }

  function updateNextEnabled() {
    const step = steps[stepIndex];
    let ok = true;
    if (step === "username") ok = draft.username && draft.username.length >= 3;
    if (step === "goal") ok = !!draft.goal;
    if (step === "age") ok = !!draft.age;
    if (step === "field") ok = !!draft.field;
    nextBtn.disabled = !ok;
  }

  backBtn.addEventListener("click", () => {
    if (stepIndex > 0) { stepIndex--; render(); }
  });

  nextBtn.addEventListener("click", () => {
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      render();
    } else {
      // finish onboarding
      state.username = draft.username;
      state.answers = { goal: draft.goal, age: draft.age, field: draft.field };
      state.onboardingComplete = true;
      if (!state.profile.name) {
        state.profile.name = draft.username
          .split("-")
          .filter(Boolean)
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(" ");
      }
      saveState(state);
      window.location.href = "dashboard.html";
    }
  });

  render();
}

/* ---------------- dashboard (dashboard.html) ---------------- */
function initDashboard() {
  let state = loadState();
  if (!state.onboardingComplete) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("handleLabel").textContent = `per.bio/${state.username}`;
  document.getElementById("publicLink").href = "profile.html";

  const tabButtons = document.querySelectorAll(".tab-rail button");
  const panels = document.querySelectorAll(".panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
      const target = btn.getAttribute("data-tab");
      panels.forEach((p) => p.classList.toggle("active", p.getAttribute("data-panel") === target));
    });
  });

  function persist() {
    saveState(state);
    refreshPreview();
  }

  function refreshPreview() {
    const el = document.getElementById("previewPage");
    el.innerHTML = renderPublicMarkup(state, { compact: true });
    wirePublicTabs(el);
    mountCalendarIfNeeded(el, state, () => { saveState(state); renderBookingsList(); });
  }

  /* ---- Profile panel ---- */
  const nameInput = document.getElementById("nameInput");
  const taglineInput = document.getElementById("taglineInput");
  const avatarCircle = document.getElementById("avatarCircle");
  const avatarFile = document.getElementById("avatarFile");

  nameInput.value = state.profile.name;
  taglineInput.value = state.profile.tagline;
  updateAvatarCircle();

  function updateAvatarCircle() {
    avatarCircle.innerHTML = state.profile.avatar
      ? `<img src="${state.profile.avatar}" alt="">`
      : initials(state.profile.name || state.username);
  }

  nameInput.addEventListener("input", () => {
    state.profile.name = nameInput.value;
    updateAvatarCircle();
    persist();
  });
  taglineInput.addEventListener("input", () => {
    state.profile.tagline = taglineInput.value;
    persist();
  });
  avatarCircle.addEventListener("click", () => avatarFile.click());
  avatarFile.addEventListener("change", () => {
    const file = avatarFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.profile.avatar = reader.result;
      updateAvatarCircle();
      persist();
    };
    reader.readAsDataURL(file);
  });

  /* ---- Socials panel ---- */
  const socialGrid = document.getElementById("socialGrid");
  socialGrid.innerHTML = SOCIAL_PLATFORMS.map((s) => `
    <div class="social-row">
      <div class="social-chip" style="background:${s.color}">${s.initials}</div>
      <input type="text" placeholder="${s.label} URL or @handle" data-social="${s.key}" value="${escapeHtml(state.profile.socials[s.key] || "")}">
    </div>
  `).join("");
  socialGrid.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      state.profile.socials[input.getAttribute("data-social")] = input.value;
      persist();
    });
  });

  /* ---- Media panel ---- */
  const mediaList = document.getElementById("mediaList");
  function renderMediaList() {
    mediaList.innerHTML = state.profile.media.map((m, i) => `
      <div class="media-item" data-i="${i}">
        <div class="row1">
          <select data-field="platform">
            ${MEDIA_PLATFORMS.map((p) => `<option ${m.platform === p ? "selected" : ""}>${p}</option>`).join("")}
          </select>
          <input type="text" data-field="title" placeholder="Title (optional)" value="${escapeHtml(m.title)}">
        </div>
        <input type="text" data-field="url" placeholder="Paste link" value="${escapeHtml(m.url)}">
        <div class="media-item-actions"><button class="btn-text" data-remove>Remove</button></div>
      </div>
    `).join("") || `<p class="pv-empty" style="margin-bottom:16px;">No media yet — add a video below.</p>`;

    mediaList.querySelectorAll(".media-item").forEach((row) => {
      const i = +row.getAttribute("data-i");
      row.querySelectorAll("[data-field]").forEach((f) => {
        f.addEventListener("input", () => {
          state.profile.media[i][f.getAttribute("data-field")] = f.value;
          persist();
        });
      });
      row.querySelector("[data-remove]").addEventListener("click", () => {
        state.profile.media.splice(i, 1);
        persist();
        renderMediaList();
      });
    });
  }
  renderMediaList();
  document.getElementById("addMediaBtn").addEventListener("click", () => {
    state.profile.media.push({ platform: "YouTube", title: "", url: "" });
    persist();
    renderMediaList();
  });

  /* ---- Resume panel ---- */
  const resumeDrop = document.getElementById("resumeDrop");
  const resumeFileInput = document.getElementById("resumeFileInput");
  const resumeFileLabel = document.getElementById("resumeFileLabel");
  const resumeLinkInput = document.getElementById("resumeLinkInput");

  resumeLinkInput.value = state.profile.resume.link;
  updateResumeFileLabel();

  function updateResumeFileLabel() {
    resumeFileLabel.classList.toggle("hidden", !state.profile.resume.fileName);
    if (state.profile.resume.fileName) {
      resumeFileLabel.querySelector("span").textContent = state.profile.resume.fileName;
    }
  }
  resumeDrop.addEventListener("click", () => resumeFileInput.click());
  resumeFileInput.addEventListener("change", () => {
    const file = resumeFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.profile.resume.fileName = file.name;
      state.profile.resume.fileData = reader.result;
      updateResumeFileLabel();
      persist();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("removeResumeFile").addEventListener("click", (e) => {
    e.stopPropagation();
    state.profile.resume.fileName = "";
    state.profile.resume.fileData = "";
    updateResumeFileLabel();
    persist();
  });
  resumeLinkInput.addEventListener("input", () => {
    state.profile.resume.link = resumeLinkInput.value;
    persist();
  });

  /* ---- About panel ---- */
  const aboutInput = document.getElementById("aboutInput");
  aboutInput.value = state.profile.about;
  aboutInput.addEventListener("input", () => {
    state.profile.about = aboutInput.value;
    persist();
  });

  /* ---- Contact panel ---- */
  const emailInput = document.getElementById("emailInput");
  const phoneInput = document.getElementById("phoneInput");
  const locationInput = document.getElementById("locationInput");
  emailInput.value = state.profile.contact.email;
  phoneInput.value = state.profile.contact.phone;
  locationInput.value = state.profile.contact.location;
  [["email", emailInput], ["phone", phoneInput], ["location", locationInput]].forEach(([k, el]) => {
    el.addEventListener("input", () => {
      state.profile.contact[k] = el.value;
      persist();
    });
  });

  /* ---- Booking panel ---- */
  const gmailNotConnected = document.getElementById("gmailNotConnected");
  const gmailConnectedBox = document.getElementById("gmailConnected");
  const gmailEmailInput = document.getElementById("gmailEmailInput");
  const connectGmailBtn = document.getElementById("connectGmailBtn");
  const gmailEmailLabel = document.getElementById("gmailEmailLabel");
  const disconnectGmailBtn = document.getElementById("disconnectGmailBtn");
  const dayToggleRow = document.getElementById("dayToggleRow");
  const startHourSelect = document.getElementById("startHourSelect");
  const endHourSelect = document.getElementById("endHourSelect");
  const slotLengthSelect = document.getElementById("slotLengthSelect");
  const bookingNoteInput = document.getElementById("bookingNoteInput");
  const bookingsListEl = document.getElementById("bookingsList");

  function hourOptionsHtml(selected) {
    let html = "";
    for (let h = 0; h <= 23; h++) {
      html += `<option value="${h}" ${h === selected ? "selected" : ""}>${formatTime12(`${pad2(h)}:00`)}</option>`;
    }
    return html;
  }
  startHourSelect.innerHTML = hourOptionsHtml(state.profile.booking.startHour);
  endHourSelect.innerHTML = hourOptionsHtml(state.profile.booking.endHour);
  slotLengthSelect.value = String(state.profile.booking.slotMinutes);
  bookingNoteInput.value = state.profile.booking.note;

  function renderDayToggles() {
    dayToggleRow.innerHTML = WEEKDAYS.map((w) => `
      <button type="button" class="day-chip ${state.profile.booking.daysAvailable.includes(w) ? "selected" : ""}" data-day="${w}">${w}</button>
    `).join("");
    dayToggleRow.querySelectorAll("[data-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const day = btn.getAttribute("data-day");
        const arr = state.profile.booking.daysAvailable;
        const idx = arr.indexOf(day);
        if (idx > -1) arr.splice(idx, 1); else arr.push(day);
        renderDayToggles();
        persist();
      });
    });
  }

  function renderBookingsList() {
    const bookings = (state.profile.booking.bookings || []).slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    bookingsListEl.innerHTML = bookings.length
      ? bookings.map((b) => `<div class="pv-row"><span class="k">${escapeHtml(b.date)} · ${formatTime12(b.time)}</span><span>${escapeHtml(b.name)}</span></div>`).join("")
      : `<p class="pv-empty">No bookings yet.</p>`;
  }

  function renderGmailUI() {
    const connected = state.profile.booking.gmailConnected;
    gmailNotConnected.classList.toggle("hidden", connected);
    gmailConnectedBox.classList.toggle("hidden", !connected);
    if (connected) {
      gmailEmailLabel.textContent = state.profile.booking.gmailEmail;
      renderDayToggles();
      renderBookingsList();
    }
  }

  connectGmailBtn.addEventListener("click", () => {
    const val = gmailEmailInput.value.trim();
    if (!val || !val.includes("@")) { gmailEmailInput.focus(); return; }
    state.profile.booking.gmailConnected = true;
    state.profile.booking.gmailEmail = val;
    renderGmailUI();
    persist();
  });
  disconnectGmailBtn.addEventListener("click", () => {
    state.profile.booking.gmailConnected = false;
    renderGmailUI();
    persist();
  });
  startHourSelect.addEventListener("change", () => { state.profile.booking.startHour = +startHourSelect.value; persist(); });
  endHourSelect.addEventListener("change", () => { state.profile.booking.endHour = +endHourSelect.value; persist(); });
  slotLengthSelect.addEventListener("change", () => { state.profile.booking.slotMinutes = +slotLengthSelect.value; persist(); });
  bookingNoteInput.addEventListener("input", () => { state.profile.booking.note = bookingNoteInput.value; persist(); });

  renderGmailUI();

  /* ---- Design panel ---- */
  const tplGrid = document.getElementById("tplGrid");
  const swatchRow = document.getElementById("swatchRow");

  function renderDesign() {
    tplGrid.innerHTML = TEMPLATES.map((t) => `
      <button type="button" class="tpl-card ${state.profile.template === t.id ? "selected" : ""}" data-tpl="${t.id}">
        <div class="thumb thumb-${t.id}"><i class="th-av"></i><i class="th-l1"></i><i class="th-l2"></i><i class="th-bar"></i></div>
        <div class="tpl-name">${t.name}</div>
        <div class="tpl-desc">${t.desc}</div>
      </button>
    `).join("");
    tplGrid.querySelectorAll("[data-tpl]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.profile.template = btn.getAttribute("data-tpl");
        renderDesign();
        persist();
      });
    });

    const current = state.profile.accent || ACCENTS[0];
    swatchRow.innerHTML = ACCENTS.map((c) => `
      <button type="button" class="swatch ${c === current ? "selected" : ""}" data-accent="${c}" style="background:${c}" title="${c}"></button>
    `).join("");
    swatchRow.querySelectorAll("[data-accent]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = btn.getAttribute("data-accent");
        state.profile.accent = c === ACCENTS[0] ? "" : c;
        renderDesign();
        persist();
      });
    });
  }
  renderDesign();

  /* ---- reset ---- */
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Reset all demo data and start over?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = "index.html";
    }
  });

  refreshPreview();
}

/* ---------------- public profile (profile.html) ---------------- */
function initProfile() {
  const state = loadState();
  document.getElementById("publicHandle").textContent = `per.bio/${state.username || "you"}`;
  const root = document.getElementById("publicRoot");
  root.innerHTML = renderPublicMarkup(state, { compact: false });
  wirePublicTabs(root);
  mountCalendarIfNeeded(root, state, () => saveState(state));
  const tpl = TEMPLATES.find((t) => t.id === state.profile.template) || TEMPLATES[0];
  document.body.style.background = tpl.bg;
  document.body.classList.toggle("tpl-dark", tpl.dark);
  document.title = `${state.profile.name || state.username || "Portfolio"} — per.bio`;
}