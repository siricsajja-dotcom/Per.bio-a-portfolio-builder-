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

const MEDIA_PLATFORMS = ["YouTube", "TikTok", "Vimeo", "Published work", "Project", "Article", "Other"];

const MAX_FILES = 5;

/* =========================================================
   Resume -> work timeline (runs fully in the browser)
   PDF via pdf.js, DOCX via mammoth (both lazy-loaded from cdnjs)
   ========================================================= */
const TL_LIBS = {
  pdf: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  pdfWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  mammoth: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
};
const MONTHS3 = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const MONTHS_CAP = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MON_RE = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const SEASON_RE = "(?:spring|summer|fall|autumn|winter)";
const YEAR_RE = "(?:19|20)\\d{2}";
const DATE_RE = `(?:\\b(?:${MON_RE}|${SEASON_RE})[\\s,]*${YEAR_RE}\\b|\\b\\d{1,2}\\/${YEAR_RE}\\b|\\b${YEAR_RE}\\b)`;
const NOW_RE = "(?:present|current|now|ongoing|today)";
const SEP_RE = "\\s*(?:[-–—]|\\bto\\b|\\buntil\\b)\\s*";
const RANGE_RE = new RegExp(`(${DATE_RE})${SEP_RE}(${DATE_RE}|\\b${NOW_RE}\\b)`, "i");
const SHARED_RE = new RegExp(`\\b(${MON_RE}|${SEASON_RE})${SEP_RE}(${MON_RE}|${SEASON_RE})[\\s,]*(${YEAR_RE})\\b`, "i");
const SINGLE_RE = new RegExp(`\\b(?:${MON_RE}|${SEASON_RE})[\\s,]*${YEAR_RE}\\b`, "i");
const WORK_HEAD = /^(?:[a-z]+\s+){0,2}(?:experiences?|employment(?: history)?|work history|career history|internships?)(?:\s*(?:&|and)\s*[a-z ]+)?$/i;
const INV_HEAD = /^(?:leadership|volunteer\w*|community service|involvement|extracurricular\w*|activities)\b/i;
const OTHER_HEAD = /^(?:education|skills?|technical skills|projects?|honors|awards?|certifications?|publications?|summary|profile|objective|references|languages|interests|coursework|academic|training|achievements|additional information)\b/i;
const ROLE_RE = /\b(?:intern(?:ship)?|engineer|developer|manager|analyst|assistant|associate|director|coordinator|specialist|consultant|designer|researcher|tutor|lead|president|vice|officer|representative|clerk|cashier|server|barista|instructor|counselor|teaching|fellow|scientist|technician|administrator|supervisor|co-?op|volunteer|captain|chair|member|editor|writer|producer|trainee|apprentice|head|founder|owner|staff|lifeguard|cook|driver|architect|advisor|ambassador|mentor|organizer|sales|host|ta|ra)\b/i;
const LOC_RE = /([A-Z][\w.'’-]*(?:\s+[A-Z][\w.'’-]*){0,2},\s*(?:[A-Z]{2}|USA|United States|UK|Canada|India|China|Japan|Germany|France|Spain|Italy|Mexico|Brazil)\b|\bRemote\b|\bHybrid\b)/;

function isBullet(l) { return /^\s*[•●▪■◦∙·*▸►➢➤–—-]\s*\S/.test(l) && !/^\s*[-–—]\s*\d/.test(l); }
function stripBullet(l) { return l.replace(/^\s*[•●▪■◦∙·*▸►➢➤–—-]\s*/, "").trim(); }
function isHeaderish(l) {
  return !!l && !isBullet(l) && l.length <= 80 && /^[A-Z0-9(“"']/.test(l) &&
    (!/[.;,]$/.test(l) || /\b(?:Inc|LLC|Ltd|Corp|Co)\.$/.test(l));
}
function findDate(line) {
  let m = line.match(RANGE_RE);
  if (m) return { s: m[1], e: m[2], text: m[0] };
  m = line.match(SHARED_RE);
  if (m) return { s: `${m[1]} ${m[3]}`, e: `${m[2]} ${m[3]}`, text: m[0] };
  m = line.match(SINGLE_RE);
  if (m) return { s: m[0], e: m[0], text: m[0] };
  return null;
}

function parseDateText(t) {
  t = (t || "").trim();
  if (!t) return null;
  if (new RegExp(`^${NOW_RE}$`, "i").test(t)) return { now: true };
  let m = t.match(/^(\d{1,2})\/((?:19|20)\d{2})$/);
  if (m) return { y: +m[2], m: +m[1] };
  if (/^(?:19|20)\d{2}$/.test(t)) return { y: +t, m: null };
  m = t.match(/^([a-z]+)\.?[\s,]*((?:19|20)\d{2})$/i);
  if (m) {
    const i = MONTHS3.indexOf(m[1].slice(0, 3).toLowerCase());
    if (i > -1 && m[1].length >= 3) return { y: +m[2], m: i + 1 };
    const s = { spring: 3, summer: 6, fall: 9, autumn: 9, winter: 1 }[m[1].toLowerCase()];
    if (s) return { y: +m[2], m: s, season: m[1] };
  }
  return null;
}
function normDate(t) {
  const d = parseDateText(t);
  if (!d) return (t || "").trim();
  if (d.now) return "Present";
  if (d.season) return d.season[0].toUpperCase() + d.season.slice(1).toLowerCase() + " " + d.y;
  return d.m ? `${MONTHS_CAP[d.m - 1]} ${d.y}` : String(d.y);
}
function tlKey(d, isEnd) {
  if (!d) return null;
  if (d.now) { const t = new Date(); return t.getFullYear() * 12 + t.getMonth(); }
  return d.y * 12 + (d.m ? d.m - 1 : (isEnd ? 11 : 0));
}
function tlDuration(e) {
  const s = parseDateText(e.start), en = parseDateText(e.end);
  if (!s || !en || !s.m || s.season || en.season || (!en.now && !en.m)) return "";
  const n = tlKey(en, true) - tlKey(s) + 1;
  if (n < 1) return "";
  const y = Math.floor(n / 12), mo = n % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", mo ? `${mo} mo${mo > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
}
function sortedExperience(list) {
  const k = (e) => [tlKey(parseDateText(e.end), true), tlKey(parseDateText(e.start))].map((v) => (v == null ? -1 : v));
  return list.slice().sort((a, b) => { const x = k(a), y = k(b); return y[0] - x[0] || y[1] - x[1]; });
}
function needsReview(e) { return !e.title || !e.company; }

function classifyHeader(parts) {
  let location = "";
  const segs = [];
  parts.forEach((p) => {
    p = p.replace(LOC_RE, (m) => { if (!location) location = m; return " | "; });
    p.split(/\s*(?:\||·|•|\s[–—-]\s|\s@\s|\s+at\s+(?=[A-Z]))\s*/).forEach((s) => {
      s = s.replace(/^[\s,–—-]+|[\s,–—-]+$/g, "");
      if (!s) return;
      const c = s.match(/^([^,]+),\s+(.+)$/);
      if (c && ROLE_RE.test(c[1]) && !ROLE_RE.test(c[2])) segs.push(c[1].trim(), c[2].trim());
      else segs.push(s);
    });
  });
  const roles = segs.filter((s) => ROLE_RE.test(s)), others = segs.filter((s) => !ROLE_RE.test(s));
  let title, company;
  if (roles.length) { title = roles[0]; company = others[0] || roles[1] || ""; }
  else { company = segs[0] || ""; title = segs[1] || ""; }
  return { title, company, location };
}

function buildEntries(lines, tag) {
  const info = lines.map((l) => ({ bullet: isBullet(l), d: !isBullet(l) && l.length <= 140 ? findDate(l) : null }));
  const anchors = [];
  info.forEach((x, i) => { if (x.d) anchors.push(i); });
  const claimed = new Set();
  const ok = (j) => j >= 0 && j < lines.length && !claimed.has(j) && !info[j].d && isHeaderish(lines[j]);
  const heads = anchors.map((a, k) => {
    const prevA = k ? anchors[k - 1] : -1, nextA = k + 1 < anchors.length ? anchors[k + 1] : lines.length;
    const resid = lines[a].replace(info[a].d.text, " | ");
    const hasResid = resid.replace(/[|\s·•,–—-]/g, "") !== "";
    let room = hasResid ? 1 : 2;
    const pre = [];
    for (let j = a - 1; j > prevA && room > 0 && ok(j); j--) { pre.unshift(j); claimed.add(j); room--; }
    let post = [], j = a + 1;
    while (j < nextA && post.length < room && ok(j)) { post.push(j); j++; }
    if (post.length && j < nextA) post.forEach((p) => claimed.add(p)); else post = [];
    return { a, pre, post, resid: hasResid ? resid : "" };
  });
  return heads.map((h, k) => {
    const first = h.pre.length ? h.pre[0] : h.a;
    const last = h.post.length ? h.post[h.post.length - 1] : h.a;
    const nextH = heads[k + 1];
    const end = nextH ? (nextH.pre.length ? nextH.pre[0] : nextH.a) - 1 : lines.length - 1;
    const parts = [...h.pre.map((j) => lines[j]), ...(h.resid ? [h.resid] : []), ...h.post.map((j) => lines[j])];
    const body = lines.slice(last + 1, end + 1);
    const usesBullets = body.some(isBullet);
    const bullets = [];
    body.forEach((t) => {
      if (isBullet(t)) bullets.push(stripBullet(t));
      else if (bullets.length && (usesBullets || !/[.!?]$/.test(bullets[bullets.length - 1]))) bullets[bullets.length - 1] += " " + t.trim();
      else bullets.push(t.trim());
    });
    const d = info[h.a].d, c = classifyHeader(parts);
    return { id: "e" + Date.now().toString(36) + k, title: c.title, company: c.company, location: c.location,
      start: normDate(d.s), end: normDate(d.e), bullets, tag: tag || "" };
  });
}

const PROJ_HEAD = /^(?:[a-z]+\s+){0,2}projects?(?:\s+(?:experience|work|portfolio))?(?:\s*(?:&|and)\s*[a-z ]+)?$/i;
const URL_RE = /(?:https?:\/\/|www\.)[^\s|,;)]+|\bgithub\.com\/[^\s|,;)]+/i;

function splitSections(allLines) {
  const secs = [];
  let cur = { type: "none", tag: "", lines: [] };
  secs.push(cur);
  allLines.forEach((raw) => {
    const l = raw.replace(/[:：]\s*$/, "").trim();
    const short = l.length <= 50 && l.split(/\s+/).length <= 6 && !isBullet(raw) && !findDate(l);
    let type = null, tag = "";
    if (short) {
      if (PROJ_HEAD.test(l)) type = "proj";
      else if (WORK_HEAD.test(l)) { type = "exp"; tag = /leadership/i.test(l) ? "Leadership" : /volunteer/i.test(l) ? "Volunteer" : ""; }
      else if (INV_HEAD.test(l)) { type = "exp"; tag = /leadership/i.test(l) ? "Leadership" : /volunteer|community/i.test(l) ? "Volunteer" : "Involvement"; }
      else if (OTHER_HEAD.test(l)) type = "other";
    }
    if (type) { cur = { type, tag, lines: [] }; secs.push(cur); } else cur.lines.push(raw.trim());
  });
  return secs;
}

function parseExperience(allLines) {
  const secs = splitSections(allLines);
  let use = secs.filter((s) => s.type === "exp");
  if (!use.length) use = secs.filter((s) => s.type === "none");
  return sortedExperience(use.flatMap((s) => buildEntries(s.lines, s.tag)));
}

function projectsFromSection(lines) {
  const out = [];
  let cur = null;
  const usesBullets = lines.some(isBullet);
  function start(line) {
    let text = line;
    const d = findDate(text);
    if (d) text = text.replace(d.text, " | ");
    const link = (text.match(URL_RE) || [""])[0];
    if (link) text = text.replace(link, " | ");
    const parts = text.split(/\s*\|\s*|\s+[–—]\s+|\s+·\s+/).map((x) => x.replace(/^[\s,–—-]+|[\s,–—-]+$/g, "")).filter(Boolean);
    let name = parts.shift() || line, tech = parts.join(", ");
    const p = name.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (p) { name = p[1]; tech = tech ? p[2] + ", " + tech : p[2]; }
    const date = d ? (d.s === d.e ? normDate(d.s) : normDate(d.s) + " – " + normDate(d.e)) : "";
    cur = { id: "p" + Date.now().toString(36) + out.length, name, tech, date, link, description: "", bullets: [] };
    out.push(cur);
  }
  lines.forEach((raw, i) => {
    const t = raw.trim();
    if (!t) return;
    if (isBullet(t)) { if (cur) cur.bullets.push(stripBullet(t)); return; }
    const nextBullet = i + 1 < lines.length && isBullet(lines[i + 1]);
    const words = t.split(/\s+/).length;
    const head = isHeaderish(t);
    const titleLike = head && /^[A-Z0-9]/.test(t) && words <= 8 && (nextBullet || (!usesBullets && words <= 6));
    const signal = head && (!!findDate(t) || /\|/.test(t) || URL_RE.test(t));
    const last = cur && cur.bullets.length ? cur.bullets.length - 1 : -1;
    if (!cur || titleLike || signal) start(t);
    else if (last > -1) cur.bullets[last] += " " + t;
    else cur.description += (cur.description ? " " : "") + t;
  });
  return out.filter((p) => p.name);
}

function parseProjects(allLines) {
  return splitSections(allLines).filter((s) => s.type === "proj").flatMap((s) => projectsFromSection(s.lines));
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res;
    s.onerror = () => rej(new Error("Couldn't load the resume reader. Check your internet connection and try again."));
    document.head.appendChild(s);
  });
}
async function pdfToLines(buf) {
  if (!window.pdfjsLib) await loadScript(TL_LIBS.pdf);
  try {
    const code = await (await fetch(TL_LIBS.pdfWorker)).text();
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  } catch (e) { pdfjsLib.GlobalWorkerOptions.workerSrc = TL_LIBS.pdfWorker; }
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    const rows = [];
    content.items.forEach((it) => {
      if (!it.str.trim()) return;
      const y = it.transform[5];
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, items: [] }; rows.push(row); }
      row.items.push({ x: it.transform[4], w: it.width, s: it.str });
    });
    rows.sort((a, b) => b.y - a.y).forEach((r) => {
      r.items.sort((a, b) => a.x - b.x);
      let s = "";
      r.items.forEach((it, i) => {
        if (i) { const gap = it.x - (r.items[i - 1].x + r.items[i - 1].w); s += gap > 25 ? " | " : gap > 1 ? " " : ""; }
        s += it.s;
      });
      lines.push(s.replace(/\s+/g, " ").trim());
    });
  }
  return lines.filter(Boolean);
}
async function docxToLines(buf) {
  if (!window.mammoth) await loadScript(TL_LIBS.mammoth);
  const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const dom = new DOMParser().parseFromString(value, "text/html");
  const lines = [];
  dom.body.querySelectorAll("p,li,h1,h2,h3,h4,h5,h6").forEach((el) => {
    if (el.tagName === "P" && el.parentElement.tagName === "LI") return;
    const t = el.textContent.replace(/\s+/g, " ").trim();
    if (t) lines.push(el.tagName === "LI" ? "• " + t : t);
  });
  return lines;
}
async function resumeToLines(name, buf) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext !== "pdf" && ext !== "docx") throw new Error("Please use a PDF or DOCX. For an older .doc file, save it as PDF first.");
  const lines = ext === "pdf" ? await pdfToLines(buf) : await docxToLines(buf);
  if (lines.length < 5) throw new Error("No readable text found. Scanned or image-only PDFs can't be read; try a text-based PDF or DOCX.");
  return lines;
}
function dataUrlToBuffer(u) {
  const b = atob(u.split(",")[1]), a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a.buffer;
}

function renderProjectsHtml(list) {
  const items = (list || []).filter((p) => p.name);
  if (!items.length) return `<p class="pv-empty">No projects added yet.</p>`;
  return items.map((p) => `
    <div class="pv-media-card pj">
      <div class="pj-top"><span class="pj-name">${escapeHtml(p.name)}</span>${p.date ? `<span class="pj-date">${escapeHtml(p.date)}</span>` : ""}</div>
      ${p.tech ? `<div class="pj-tech">${escapeHtml(p.tech)}</div>` : ""}
      ${p.description ? `<p class="pv-media-desc">${escapeHtml(p.description)}</p>` : ""}
      ${p.bullets && p.bullets.length ? `<ul class="tl-bul">${p.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : ""}
      ${p.link ? `<a class="pj-link" href="${escapeHtml(withHttp(p.link))}" target="_blank" rel="noopener">${escapeHtml(p.link)}</a>` : ""}
    </div>`).join("");
}

function renderTimelineHtml(list) {
  const items = sortedExperience(list || []).filter((e) => e.title || e.company);
  if (!items.length) return `<p class="pv-empty">No experience added yet.</p>`;
  return `<ol class="tl">${items.map((e) => {
    const dur = tlDuration(e);
    const dates = [e.start, e.end && e.end !== e.start ? e.end : ""].filter(Boolean).join(" – ");
    const sub = [e.title ? e.company : "", e.location].filter(Boolean).join(" · ");
    return `<li class="tl-item">
      <div class="tl-dates">${escapeHtml(dates)}${dur ? ` · ${dur}` : ""}</div>
      <div class="tl-title">${escapeHtml(e.title || e.company)}${e.tag ? ` <span class="tl-tag">${escapeHtml(e.tag)}</span>` : ""}</div>
      ${sub ? `<div class="tl-co">${escapeHtml(sub)}</div>` : ""}
      ${e.bullets && e.bullets.length ? `<ul class="tl-bul">${e.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : ""}
    </li>`;
  }).join("")}</ol>`;
}


// simplified inline SVG glyphs (inherit the chip's text color)
const SOCIAL_ICONS = {
  facebook:  '<path d="M13.5 21v-7.500h2.600l.4-3h-3V8.600c0-.9.3-1.500 1.500-1.500h1.600V4.400c-.3 0-1.200-.1-2.300-.1-2.300 0-3.900 1.400-3.900 4v2.200H7.800v3h2.600V21h3.100z" fill="currentColor"/>',
  instagram: '<rect x="3.500" y="3.500" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.300" cy="6.700" r="1.200" fill="currentColor"/>',
  tiktok:    '<path d="M16.500 3c.3 2.300 1.700 3.800 4 4v3c-1.500 0-2.900-.5-4-1.300V15a6 6 0 1 1-6-6v3.100a2.900 2.900 0 1 0 2.900 2.900V3h3.100z" fill="currentColor"/>',
  snapchat:  '<path d="M12 3C9 3 7.300 5.200 7.300 8v1.800c-.5.100-1.300.1-1.800.4.4.8 1.300.7 1.800 1-.3 1.400-1.700 2.600-3 3 .3.7 1.500.8 2.200 1 .1.300.1.700.4.900 1 .1 1.700-.3 2.600.1.7.5 1.500 1.500 2.500 1.500s1.800-1 2.500-1.500c.9-.4 1.600 0 2.600-.1.3-.2.3-.6.4-.9.7-.2 1.900-.3 2.200-1-1.300-.4-2.700-1.600-3-3 .5-.3 1.400-.2 1.800-1-.5-.3-1.300-.3-1.800-.4V8C16.700 5.200 15 3 12 3z" fill="currentColor"/>',
  pinterest: '<path d="M9.500 20.500l2-8.500M10 13.500C8.800 9.800 10 7 12.500 7c2.200 0 3 1.800 2.500 3.600-.5 1.900-2 2.900-3.300 2.400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  youtube:   '<rect x="2.500" y="5.500" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9v6l5-3z" fill="currentColor"/>',
  linkedin:  '<rect x="4" y="9.500" width="3" height="10.500" fill="currentColor"/><circle cx="5.500" cy="5.700" r="1.800" fill="currentColor"/><path d="M10 9.500h2.900V11c.5-.9 1.700-1.700 3.300-1.700 3 0 3.800 1.900 3.800 4.500V20h-3v-5.500c0-1.200-.2-2.400-1.700-2.400-1.500 0-1.800 1.100-1.800 2.400V20H10z" fill="currentColor"/>',
  handshake: '<path d="M6 5v14M18 5v14M6 12h12" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/>',
  x:         '<path d="M4.500 4.500l15 15M19.500 4.500l-15 15" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/>',
};
function socialIcon(key) {
  return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${SOCIAL_ICONS[key] || ""}</svg>`;
}


// supports old single-file saves too
function getResumeFiles(r) {
  if (Array.isArray(r.files) && r.files.length) return r.files;
  return r.fileData ? [{ name: r.fileName || "resume.pdf", data: r.fileData }] : [];
}

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
      // real, no-backend hand-offs: Google Calendar (owner added as guest), .ics file, and an email to the owner
      const b = state.profile.booking;
      const owner = b.gmailEmail || "";
      const title = `Meeting with ${state.profile.name || state.username}`;
      const start = new Date(`${selectedKey}T${time}:00`);
      const end = new Date(start.getTime() + b.slotMinutes * 60000);
      const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
      const details = `Booked through per.bio by ${name} (${email})`;
      const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(details)}${owner ? "&add=" + encodeURIComponent(owner) : ""}`;
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//per.bio//EN", "BEGIN:VEVENT",
        `UID:${Date.now()}@per.bio`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
        `SUMMARY:${title}`, `DESCRIPTION:${details}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      const icsUrl = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
      const mail = `mailto:${owner}?subject=${encodeURIComponent("Booking: " + selectedKey + " " + formatTime12(time))}&body=${encodeURIComponent(details + "\n" + selectedKey + " at " + formatTime12(time))}`;
      mount.innerHTML = `
        <div class="cal-confirm-success">
          <p>Booked for ${escapeHtml(selectedKey)} at ${formatTime12(time)}. Add it to your calendar:</p>
          <p style="display:flex; gap:8px; flex-wrap:wrap;">
            <a class="btn btn-primary btn-sm" href="${escapeHtml(gcal)}" target="_blank" rel="noopener">Google Calendar</a>
            <a class="btn btn-outline btn-sm" href="${icsUrl}" download="booking.ics">Download .ics</a>
            ${owner ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(mail)}">Email ${escapeHtml(state.profile.name || "them")}</a>` : ""}
            <button type="button" class="btn-text" id="calDone">Done</button>
          </p>
        </div>`;
      mount.querySelector("#calDone").addEventListener("click", draw);
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
      resume: { fileName: "", fileData: "", link: "", files: [] },
      experience: { entries: [], source: "" },
      projects: { entries: [], source: "" },
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
        experience: { ...base.profile.experience, ...((parsed.profile || {}).experience || {}) },
        projects: { ...base.profile.projects, ...((parsed.profile || {}).projects || {}) },
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
      return `<a class="${chipClass}" style="background:${s.color}" href="${withHttp(p.socials[s.key])}" target="_blank" rel="noopener" title="${s.label}" aria-label="${s.label}">${socialIcon(s.key)}</a>`;
    })
    .join("");

  const mediaHtml = p.media.length
    ? p.media.map((m) => `
        <div class="pv-media-card">
          <div class="plat">${escapeHtml(m.platform)}</div>
          <a href="${withHttp(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.title || m.url)}</a>
          ${m.description ? `<p class="pv-media-desc" style="white-space:pre-wrap;">${escapeHtml(m.description)}</p>` : ""}
        </div>`).join("")
    : `<p class="pv-empty">No media added yet.</p>`;

  const resumeFiles = getResumeFiles(p.resume);
  const resumeHtml = (resumeFiles.length || p.resume.link)
    ? `
      ${resumeFiles.map((f) => `
        <div class="pv-row">
          <span>${escapeHtml(f.name)}</span>
          <a class="btn btn-outline btn-sm" href="${f.data}" download="${escapeHtml(f.name)}">Download</a>
        </div>`).join("")}
      ${p.resume.link ? `<div class="pv-row"><span class="k">Link</span><a href="${withHttp(p.resume.link)}" target="_blank" rel="noopener">${escapeHtml(p.resume.link)}</a></div>` : ""}
    `
    : `<p class="pv-empty">No files uploaded yet.</p>`;

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
  const timelineHtml = renderTimelineHtml((p.experience || {}).entries);
  const projectsHtml = renderProjectsHtml((p.projects || {}).entries);
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
      <button data-pv-tab="about" class="active">About</button>
      <button data-pv-tab="timeline">Timeline</button>
      <button data-pv-tab="projects">Projects</button>
      <button data-pv-tab="media">Media</button>
      <button data-pv-tab="resume">Resume/CV</button>
      <button data-pv-tab="contact">Contact</button>
      <button data-pv-tab="booking">Booking</button>
    </div>
    <div class="pv-panel active" data-pv-panel="about">${aboutHtml}</div>
    <div class="pv-panel" data-pv-panel="timeline">${timelineHtml}</div>
    <div class="pv-panel" data-pv-panel="projects">${projectsHtml}</div>
    <div class="pv-panel" data-pv-panel="media">${mediaHtml}</div>
    <div class="pv-panel" data-pv-panel="resume">${resumeHtml}</div>
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
      <div class="social-chip" style="background:${s.color}">${socialIcon(s.key)}</div>
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
        <input type="text" data-field="url" placeholder="Paste any link: video, article, project, publication" value="${escapeHtml(m.url)}">
        <textarea data-field="description" rows="3" placeholder="Describe it: what it is, your role, what you contributed">${escapeHtml(m.description)}</textarea>
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
    state.profile.media.push({ platform: "Other", title: "", url: "", description: "" });
    persist();
    renderMediaList();
  });

  /* ---- Resume panel (up to 5 files) ---- */
  const filesList = document.getElementById("filesList");
  const filesDrop = document.getElementById("filesDrop");
  const filesInput = document.getElementById("filesInput");
  const fileCount = document.getElementById("fileCount");
  const filesMsg = document.getElementById("filesMsg");
  const resumeLinkInput = document.getElementById("resumeLinkInput");
  const R = state.profile.resume;

  R.files = getResumeFiles(R).slice();   // move any old single file into the list
  R.fileName = ""; R.fileData = "";
  resumeLinkInput.value = R.link;

  function renderFiles() {
    filesList.innerHTML = "";
    R.files.forEach((f, i) => {
      const row = document.createElement("div");
      row.className = "resume-file";
      const name = document.createElement("span");
      name.textContent = f.name;
      const rm = document.createElement("button");
      rm.type = "button"; rm.className = "btn-text"; rm.textContent = "Remove";
      rm.addEventListener("click", () => { R.files.splice(i, 1); filesMsg.textContent = ""; persist(); renderFiles(); });
      row.append(name, rm);
      filesList.appendChild(row);
    });
    fileCount.textContent = R.files.length;
    const full = R.files.length >= MAX_FILES;
    filesDrop.style.opacity = full ? ".5" : "";
    filesDrop.style.pointerEvents = full ? "none" : "";
    if (full) filesMsg.textContent = `You've reached the ${MAX_FILES} file limit. Remove one to add another.`;
  }

  function readFile(file) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ name: file.name, type: file.type, data: r.result });
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });
  }

  filesInput.addEventListener("change", async () => {
    const picked = Array.from(filesInput.files);
    filesInput.value = "";
    const room = MAX_FILES - R.files.length;
    const skipped = Math.max(0, picked.length - room);
    filesMsg.textContent = "";
    for (const file of picked.slice(0, room)) {
      const item = await readFile(file);
      if (!item) { filesMsg.textContent = `Couldn't read ${file.name}.`; continue; }
      R.files.push(item);
      try { saveState(state); }
      catch (e) { R.files.pop(); filesMsg.textContent = `${file.name} is too large to save. Try a smaller file.`; }
    }
    if (skipped && !filesMsg.textContent) filesMsg.textContent = `Only ${MAX_FILES} files fit. ${skipped} weren't added.`;
    persist();
    renderFiles();
  });

  filesDrop.addEventListener("click", () => filesInput.click());
  filesDrop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); filesInput.click(); }
  });
  resumeLinkInput.addEventListener("input", () => { R.link = resumeLinkInput.value; persist(); });
  renderFiles();

  /* ---- Projects panel (separate from work timeline) ---- */
  const P = state.profile.projects;
  const pjDrop = document.getElementById("pjDrop");
  const pjInput = document.getElementById("pjInput");
  const pjMsg = document.getElementById("pjMsg");
  const pjList = document.getElementById("pjList");
  const pjSaved = document.getElementById("pjSaved");

  function renderProjects() {
    pjList.innerHTML = P.entries.map((p, i) => `
      <div class="media-item" data-i="${i}">
        <div class="tl-grid">
          <input type="text" data-f="name" placeholder="Project name" value="${escapeHtml(p.name)}">
          <input type="text" data-f="date" placeholder="Date (optional)" value="${escapeHtml(p.date)}">
          <input type="text" data-f="tech" placeholder="Tools / tech (optional)" value="${escapeHtml(p.tech)}">
          <input type="text" data-f="link" placeholder="Link (optional)" value="${escapeHtml(p.link)}">
        </div>
        <textarea data-f="description" rows="2" placeholder="Short description">${escapeHtml(p.description)}</textarea>
        <textarea data-f="bullets" rows="3" placeholder="One highlight per line">${escapeHtml((p.bullets || []).join("\n"))}</textarea>
        <div class="media-item-actions"><button type="button" class="btn-text" data-remove>Remove</button></div>
      </div>`).join("") || `<p class="pv-empty" style="margin-bottom:16px;">No projects yet. Upload a resume above or add one below.</p>`;
    pjList.querySelectorAll(".media-item").forEach((row) => {
      const i = +row.getAttribute("data-i");
      row.querySelectorAll("[data-f]").forEach((f) => {
        f.addEventListener("input", () => {
          const k = f.getAttribute("data-f");
          P.entries[i][k] = k === "bullets" ? f.value.split("\n").map((x) => x.trim()).filter(Boolean) : f.value;
          persist();
        });
      });
      row.querySelector("[data-remove]").addEventListener("click", () => { P.entries.splice(i, 1); persist(); renderProjects(); });
    });
  }

  function renderPjSaved() {
    const files = getResumeFiles(state.profile.resume).filter((f) => /\.(pdf|docx)$/i.test(f.name));
    pjSaved.innerHTML = files.length
      ? `<p class="panel-sub" style="margin:0 0 8px">Or pull projects from a file you already uploaded:</p>` +
        files.map((f, i) => `<div class="resume-file"><span>${escapeHtml(f.name)}</span><button type="button" class="btn btn-outline btn-sm" data-use="${i}">Find projects</button></div>`).join("")
      : "";
    pjSaved.querySelectorAll("[data-use]").forEach((btn) => {
      btn.addEventListener("click", () => { const f = files[+btn.getAttribute("data-use")]; buildProjects(f.name, () => dataUrlToBuffer(f.data)); });
    });
  }

  async function buildProjects(name, getBuffer) {
    pjMsg.textContent = "Reading your resume…";
    try {
      const found = parseProjects(await resumeToLines(name, await getBuffer()));
      if (!found.length) { pjMsg.textContent = "We couldn't find a Projects section in that file. Add projects manually below."; return; }
      if (P.entries.length && !confirm("Replace your current projects with the ones from this resume?")) { pjMsg.textContent = ""; return; }
      P.entries = found; P.source = name;
      persist(); renderProjects();
      pjMsg.textContent = `Found ${found.length} project${found.length === 1 ? "" : "s"} in ${name}. Give each one a quick check. Edits save automatically.`;
    } catch (err) { pjMsg.textContent = err.message || "Couldn't read that file."; }
  }

  pjDrop.addEventListener("click", () => pjInput.click());
  pjDrop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pjInput.click(); } });
  pjInput.addEventListener("change", () => {
    const file = pjInput.files[0];
    pjInput.value = "";
    if (file) buildProjects(file.name, () => file.arrayBuffer());
  });
  document.getElementById("pjAddBtn").addEventListener("click", () => {
    P.entries.unshift({ id: "p" + Date.now().toString(36), name: "", tech: "", date: "", link: "", description: "", bullets: [] });
    persist(); renderProjects();
  });
  document.querySelector('[data-tab="projects"]').addEventListener("click", renderPjSaved);
  renderProjects();
  renderPjSaved();

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

  /* ---- Timeline panel (auto-built from resume) ---- */
  const tlDrop = document.getElementById("tlDrop");
  const tlInput = document.getElementById("tlInput");
  const tlMsg = document.getElementById("tlMsg");
  const tlList = document.getElementById("tlList");
  const tlSaved = document.getElementById("tlSaved");
  const X = state.profile.experience;

  function renderTimeline() {
    tlList.innerHTML = X.entries.map((e, i) => `
      <div class="media-item" data-i="${i}">
        ${e.tag ? `<div class="tl-tag">${escapeHtml(e.tag)}</div>` : ""}
        <div class="tl-grid">
          <input type="text" data-f="title" placeholder="Job title" value="${escapeHtml(e.title)}">
          <input type="text" data-f="company" placeholder="Company or organization" value="${escapeHtml(e.company)}">
          <input type="text" data-f="start" placeholder="Start (Jun 2023)" value="${escapeHtml(e.start)}">
          <input type="text" data-f="end" placeholder="End (Aug 2023 or Present)" value="${escapeHtml(e.end)}">
        </div>
        <input type="text" data-f="location" placeholder="Location (optional)" value="${escapeHtml(e.location)}">
        <textarea data-f="bullets" rows="4" placeholder="One accomplishment per line">${escapeHtml((e.bullets || []).join("\n"))}</textarea>
        <div class="media-item-actions">${needsReview(e) ? `<span class="tl-review">Check details</span>` : ""}<button type="button" class="btn-text" data-remove>Remove</button></div>
      </div>`).join("") || `<p class="pv-empty" style="margin-bottom:16px;">No roles yet. Upload a resume above or add one below.</p>`;
    tlList.querySelectorAll(".media-item").forEach((row) => {
      const i = +row.getAttribute("data-i");
      row.querySelectorAll("[data-f]").forEach((f) => {
        f.addEventListener("input", () => {
          const k = f.getAttribute("data-f");
          X.entries[i][k] = k === "bullets" ? f.value.split("\n").map((s) => s.trim()).filter(Boolean) : f.value;
          persist();
        });
        if (f.getAttribute("data-f") === "start" || f.getAttribute("data-f") === "end") {
          f.addEventListener("blur", () => { X.entries[i][f.getAttribute("data-f")] = normDate(f.value); persist(); renderTimeline(); });
        }
      });
      row.querySelector("[data-remove]").addEventListener("click", () => { X.entries.splice(i, 1); persist(); renderTimeline(); });
    });
  }

  function renderTlSaved() {
    const files = getResumeFiles(state.profile.resume).filter((f) => /\.(pdf|docx)$/i.test(f.name));
    tlSaved.innerHTML = files.length
      ? `<p class="panel-sub" style="margin:0 0 8px">Or build it from a file you already uploaded:</p>` +
        files.map((f, i) => `<div class="resume-file"><span>${escapeHtml(f.name)}</span><button type="button" class="btn btn-outline btn-sm" data-use="${i}">Build timeline</button></div>`).join("")
      : "";
    tlSaved.querySelectorAll("[data-use]").forEach((btn) => {
      btn.addEventListener("click", () => { const f = files[+btn.getAttribute("data-use")]; buildTimeline(f.name, () => dataUrlToBuffer(f.data)); });
    });
  }

  async function buildTimeline(name, getBuffer) {
    tlMsg.textContent = "Reading your resume…";
    try {
      const lines = await resumeToLines(name, await getBuffer());
      const entries = parseExperience(lines);
      if (!entries.length) { tlMsg.textContent = "We couldn't find any dated roles in that file. Add them manually below."; return; }
      if (X.entries.length && !confirm("Replace your current timeline with the roles from this resume?")) { tlMsg.textContent = ""; return; }
      X.entries = entries; X.source = name;
      let extra = "";
      const projs = parseProjects(lines);
      if (projs.length && !P.entries.length) { P.entries = projs; P.source = name; renderProjects(); extra = ` ${projs.length} project${projs.length === 1 ? " was" : "s were"} added to the Projects tab.`; }
      persist(); renderTimeline();
      tlMsg.textContent = `Found ${entries.length} role${entries.length === 1 ? "" : "s"} in ${name}. Resume layouts vary, so give each one a quick check. Edits save automatically.${extra}`;
    } catch (err) { tlMsg.textContent = err.message || "Couldn't read that file."; }
  }

  tlDrop.addEventListener("click", () => tlInput.click());
  tlDrop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tlInput.click(); } });
  tlInput.addEventListener("change", () => {
    const file = tlInput.files[0];
    tlInput.value = "";
    if (file) buildTimeline(file.name, () => file.arrayBuffer());
  });
  document.getElementById("tlAddBtn").addEventListener("click", () => {
    X.entries.unshift({ id: "e" + Date.now().toString(36), title: "", company: "", location: "", start: "", end: "", bullets: [], tag: "" });
    persist(); renderTimeline();
  });
  document.querySelector('[data-tab="timeline"]').addEventListener("click", renderTlSaved);
  renderTimeline();
  renderTlSaved();

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