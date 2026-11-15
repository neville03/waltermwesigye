import config from './config.js';
import { SECTION_TYPES, SITE_FIELDS, PAGE_FIELDS, sectionTitle } from './schemas.js';
import * as gh from './github.js';
import { saveDraft, loadDraft, clearDraft } from './store.js';
import { youtubeId, isVideo } from '../js/render.js';

// ---------- small helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(c));
  return el;
}
const icon = d => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = d; return s; };
const ICON = {
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'
};
const iconBtn = (name, title, onclick) => h('button', { class: 'icon-btn', type: 'button', title, 'aria-label': title, onclick }, icon(ICON[name]));
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const clone = o => JSON.parse(JSON.stringify(o));
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; return d; };
let uid = 0;

function toast(msg, kind = '', ms = 3500) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------- state ----------
const state = {
  mode: 'github',          // or 'demo'
  content: null,
  published: '',           // JSON of the last published version
  headSha: null,
  pageSlug: 'home',
  sel: 0,                  // section index, 'page', 'site' or null
  uploads: {},             // path -> Blob (not yet published)
  blobUrls: {},            // path -> object URL, for previews
  history: [], future: [], snapshot: ''
};
const page = () => state.content.pages.find(p => p.slug === state.pageSlug) || state.content.pages[0];
const json = () => JSON.stringify(state.content);
const isDirty = () => json() !== state.published;
const mediaUrl = p => !p ? '' : state.blobUrls[p] || (/^(https?:|blob:|data:)/.test(p) ? p : '../' + p);

// ---------- boot ----------
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const password = $('#password').value;
  const btn = $('#login-form button[type=submit]');
  $('#login-error').textContent = '';
  if (!password) { $('#login-error').textContent = 'Enter the password.'; return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    await gh.login(password);
    $('#password').value = '';
    await startGithub();
  } catch (err) {
    $('#login-error').textContent = err.message;
    $('#password').select();
  } finally {
    btn.disabled = false; btn.textContent = 'Sign in';
  }
});

$('#show-pw').addEventListener('click', () => {
  const pw = $('#password');
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  $('#show-pw').textContent = show ? 'Hide' : 'Show';
  pw.focus();
});

$('#demo-btn').addEventListener('click', startDemo);

async function startGithub() {
  const { content, headSha } = await gh.loadContent();
  state.mode = 'github';
  state.headSha = headSha;
  await start(content);
}

async function startDemo() {
  const res = await fetch('../content/site.json', { cache: 'no-cache' });
  state.mode = 'demo';
  await start(await res.json());
}

async function start(content) {
  state.content = content;
  state.published = JSON.stringify(content);
  const draft = await loadDraft();
  if (draft && draft.mode === state.mode && JSON.stringify(draft.content) !== state.published) {
    state.content = draft.content;
    for (const [path, blob] of Object.entries(draft.uploads || {})) {
      state.uploads[path] = blob;
      state.blobUrls[path] = URL.createObjectURL(blob);
    }
    if (state.mode === 'github' && draft.headSha && draft.headSha !== state.headSha) {
      toast('Restored your unpublished changes. Note: the website was also updated somewhere else since then.', '', 6000);
    } else {
      toast('Restored your unpublished changes.');
    }
  }
  state.snapshot = json();
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#demo-badge').hidden = state.mode !== 'demo';
  $('#publish').innerHTML = state.mode === 'demo' ? 'Download<span class="long">&nbsp;changes</span>' : 'Publish';
  renderAll();
  fitFrame();
}

(async function boot() {
  try {
    if (await gh.signedIn()) { await startGithub(); return; }
  } catch (err) {
    if (err.status !== 401) $('#login-error').textContent = err.message;
  }
  $('#login').hidden = false;
  setTimeout(() => $('#password').focus(), 50);
})();

// ---------- change tracking, undo, autosave ----------
const recordHistory = debounce(() => {
  const now = json();
  if (now === state.snapshot) return;
  state.history.push(state.snapshot);
  if (state.history.length > 80) state.history.shift();
  state.future = [];
  state.snapshot = now;
  updateUndo();
}, 600);

const persist = debounce(() => {
  if (!isDirty() && !Object.keys(state.uploads).length) { clearDraft(); return; }
  saveDraft({ mode: state.mode, content: state.content, uploads: state.uploads, headSha: state.headSha, savedAt: Date.now() });
}, 400);

const refreshSidebar = debounce(() => renderSidebar(), 250);

function changed({ sidebar = true, full = false } = {}) {
  recordHistory();
  persist();
  updateStatus();
  sendPreview({ forceFull: full });
  if (sidebar) refreshSidebar();
}

function updateStatus() {
  const dirty = isDirty();
  const el = $('#status');
  el.className = 'status' + (dirty ? ' dirty' : '');
  el.innerHTML = '';
  el.append(h('span', { class: 'dot' }), h('span', {
    text: dirty
      ? (state.mode === 'demo' ? 'Practice changes, not saved to the website' : 'Unpublished changes, saved on this device')
      : (state.mode === 'demo' ? 'Practice mode: changes stay in this browser' : 'Everything is published')
  }));
  $('#publish').disabled = !dirty;
}

function updateUndo() {
  $('#undo').disabled = !state.history.length;
  $('#redo').disabled = !state.future.length;
}

function restore(snapshotJson) {
  state.content = JSON.parse(snapshotJson);
  state.snapshot = snapshotJson;
  if (!state.content.pages.some(p => p.slug === state.pageSlug)) state.pageSlug = 'home';
  if (typeof state.sel === 'number' && state.sel >= page().sections.length) state.sel = page().sections.length ? 0 : null;
  persist(); updateStatus(); updateUndo();
  renderAll();
}
function undo() {
  recordHistory.flush();
  if (!state.history.length) return;
  state.future.push(json());
  restore(state.history.pop());
}
function redo() {
  if (!state.future.length) return;
  state.history.push(json());
  restore(state.future.pop());
}
$('#undo').onclick = undo;
$('#redo').onclick = redo;
document.addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
  if (e.target.matches('input, textarea')) return; // let fields undo their own typing first
  e.preventDefault();
  e.shiftKey ? redo() : undo();
});

// ---------- preview ----------
const frame = $('#frame');
let popup = null;
let device = window.innerWidth < 900 ? 'mobile' : 'desktop';
$$('.seg button').forEach(x => x.classList.toggle('active', x.dataset.device === device));

function previewMessage(extra = {}) {
  return {
    type: 'content', content: state.content, page: state.pageSlug, media: state.blobUrls,
    selected: typeof state.sel === 'number' ? state.sel : null, ...extra
  };
}
const sendPreviewNow = (extra = {}) => {
  const msg = previewMessage(extra);
  frame.contentWindow?.postMessage(msg, location.origin);
  if (popup && !popup.closed) popup.postMessage(msg, location.origin);
};
const sendPreviewSoon = debounce(sendPreviewNow, 120);
function sendPreview(extra = {}) {
  if (extra.forceFull || extra.scrollTo != null) { sendPreviewSoon.flush(extra); }
  else sendPreviewSoon(extra);
}

window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || !state.content) return;
  const msg = e.data;
  if (msg.type === 'preview-ready') {
    e.source.postMessage(previewMessage({ forceFull: true, scrollTo: typeof state.sel === 'number' ? state.sel : null }), location.origin);
  } else if (msg.type === 'select') {
    if (e.source !== frame.contentWindow) window.focus();
    select(msg.index, { scroll: false });
    setTab('edit');
  } else if (msg.type === 'navigate') {
    if (state.content.pages.some(p => p.slug === msg.page)) switchPage(msg.page);
  }
});

function openPopup() {
  popup = window.open('../index.html?preview=1', 'wm-preview');
  $('#more-menu').hidden = true;
}
$('#open-preview').onclick = openPopup;
$('#open-preview-2').onclick = openPopup;

$$('.seg button').forEach(b => b.onclick = () => {
  device = b.dataset.device;
  $$('.seg button').forEach(x => x.classList.toggle('active', x === b));
  fitFrame();
});

function fitFrame() {
  const wrap = $('#frame-wrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  if (!W || !H) return;
  wrap.classList.toggle('mobile', device === 'mobile');
  if (device === 'mobile') {
    const w = 390, scale = Math.min(1, (W - 32) / w, (H - 16) / 760);
    frame.style.width = w + 'px';
    frame.style.height = (H - 16) / scale + 'px';
    frame.style.transform = `translateX(-50%) scale(${scale})`;
    frame.style.transformOrigin = 'top center';
  } else {
    const w = Math.max(1280, W), scale = W / w;
    frame.style.width = w + 'px';
    frame.style.height = H / scale + 'px';
    frame.style.transform = `translateX(-50%) scale(${scale})`;
    frame.style.transformOrigin = 'top center';
  }
}
new ResizeObserver(fitFrame).observe($('#frame-wrap'));

// ---------- mobile tabs ----------
function setTab(tab) {
  $('.workspace').dataset.tab = tab;
  $$('.mobile-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'preview') requestAnimationFrame(fitFrame);
}
$$('.mobile-tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));

// ---------- top-bar menu ----------
$('#more-btn').onclick = e => {
  e.stopPropagation();
  const m = $('#more-menu');
  m.hidden = !m.hidden;
  $('#more-btn').setAttribute('aria-expanded', String(!m.hidden));
};
document.addEventListener('click', e => { if (!e.target.closest('.more')) $('#more-menu').hidden = true; });

$('#discard').onclick = async () => {
  $('#more-menu').hidden = true;
  if (!isDirty()) return toast('There are no unpublished changes.');
  if (!(await confirmBox('Discard all unpublished changes?', 'The editor will go back to what is on the website now. This can’t be undone.', 'Discard changes', true))) return;
  state.uploads = {};
  await clearDraft();
  state.history = []; state.future = [];
  restore(state.published);
  toast('Changes discarded.');
};

$('#signout').onclick = async () => {
  $('#more-menu').hidden = true;
  if (isDirty() && !(await confirmBox('Sign out?', 'Your unpublished changes stay saved on this device until you sign in again.', 'Sign out'))) return;
  await gh.logout();
  location.reload();
};

// ---------- rendering ----------
function renderAll() {
  renderSidebar();
  renderEditor();
  updateStatus();
  updateUndo();
  sendPreview({ forceFull: true });
}

function renderSidebar() {
  // pages
  const pages = $('#pages');
  pages.innerHTML = '';
  state.content.pages.forEach(p => {
    pages.append(h('button', {
      class: 'side-item' + (p.slug === state.pageSlug ? ' active' : ''), type: 'button',
      onclick: () => switchPage(p.slug)
    }, h('span', { class: 'si-icon', text: p.slug === 'home' ? '⌂' : '▢' }),
       h('span', { class: 'si-text' }, h('span', { class: 'si-title', text: p.title || p.slug }),
         h('span', { class: 'si-sub', text: p.slug === 'home' ? 'Home page' : '/?p=' + p.slug }))));
  });

  // sections
  const list = $('#sections');
  list.innerHTML = '';
  const secs = page().sections;
  if (!secs.length) list.append(h('p', { class: 'note', style: 'padding:4px 10px', text: 'No sections yet.' }));
  secs.forEach((s, i) => {
    const t = SECTION_TYPES[s.type] || { label: s.type, icon: '?' };
    const row = h('button', {
      class: 'side-item' + (state.sel === i ? ' active' : '') + (s.hidden ? ' is-hidden' : ''),
      type: 'button', draggable: 'true', 'data-index': i,
      onclick: () => { select(i); setTab('edit'); }
    }, h('span', { class: 'si-icon', text: t.icon }),
       h('span', { class: 'si-text' }, h('span', { class: 'si-title', text: sectionTitle(s) }),
         h('span', { class: 'si-sub', text: t.label + (s.hidden ? ' · hidden' : '') })),
       h('span', { class: 'grip', 'aria-hidden': 'true', text: '⋮⋮' }));
    addDrag(row, i);
    list.append(row);
  });

  $$('[data-select]').forEach(b => b.classList.toggle('active', state.sel === b.dataset.select));
  updateLinkOptions();
}

$$('[data-select]').forEach(b => b.onclick = () => { select(b.dataset.select); setTab('edit'); });

// drag to reorder sections
let dragFrom = null;
function addDrag(row, i) {
  row.addEventListener('dragstart', e => { dragFrom = i; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); });
  row.addEventListener('dragend', () => { dragFrom = null; $$('.side-item').forEach(r => r.classList.remove('dragging', 'drop-before', 'drop-after')); });
  row.addEventListener('dragover', e => {
    if (dragFrom == null) return;
    e.preventDefault();
    const after = e.offsetY > row.offsetHeight / 2;
    $$('#sections .side-item').forEach(r => r.classList.remove('drop-before', 'drop-after'));
    row.classList.add(after ? 'drop-after' : 'drop-before');
  });
  row.addEventListener('drop', e => {
    e.preventDefault();
    if (dragFrom == null) return;
    let to = i + (e.offsetY > row.offsetHeight / 2 ? 1 : 0);
    if (dragFrom < to) to--;
    moveSection(dragFrom, to);
  });
}

function moveSection(from, to) {
  const secs = page().sections;
  if (to < 0 || to >= secs.length || from === to) return;
  const [s] = secs.splice(from, 1);
  secs.splice(to, 0, s);
  state.sel = to;
  renderSidebar(); renderEditor();
  changed({ sidebar: false, full: true });
  sendPreview({ scrollTo: to });
}

function select(sel, { scroll = true } = {}) {
  state.sel = sel;
  renderSidebar();
  renderEditor();
  if (typeof sel === 'number' && scroll) sendPreview({ scrollTo: sel });
  else sendPreview();
}

function switchPage(slug) {
  state.pageSlug = slug;
  state.sel = page().sections.length ? 0 : 'page';
  renderSidebar();
  renderEditor();
  sendPreview({ forceFull: true, scrollTo: null });
}

function renderEditor() {
  const ed = $('#editor');
  ed.innerHTML = '';
  ed.scrollTop = 0;
  if (state.sel === 'site') return renderSiteSettings(ed);
  if (state.sel === 'page') return renderPageSettings(ed);
  const s = page().sections[state.sel];
  if (!s) {
    ed.append(h('div', { class: 'empty-state' },
      h('p', { text: 'Choose a section on the left to edit it, or click it in the preview.' }),
      h('button', { class: 'btn primary', type: 'button', onclick: addSectionDialog, text: '+ Add a section' })));
    return;
  }
  const t = SECTION_TYPES[s.type];
  const i = state.sel, n = page().sections.length;
  ed.append(h('div', { class: 'ed-head' },
    h('div', {}, h('div', { class: 'ed-kicker', text: `${t ? t.label : s.type} section` }), h('h2', { text: sectionTitle(s) })),
    h('div', { class: 'ed-actions' },
      i > 0 && iconBtn('up', 'Move up', () => moveSection(i, i - 1)),
      i < n - 1 && iconBtn('down', 'Move down', () => moveSection(i, i + 1)),
      iconBtn('copy', 'Duplicate', () => {
        page().sections.splice(i + 1, 0, clone(s));
        select(i + 1); changed({ full: true });
      }),
      iconBtn(s.hidden ? 'eyeOff' : 'eye', s.hidden ? 'Hidden from the website. Click to show' : 'Hide from the website', () => {
        s.hidden = !s.hidden;
        renderSidebar(); renderEditor(); changed({ full: true });
        toast(s.hidden ? 'Section hidden. It stays here so you can show it again.' : 'Section is visible again.');
      }),
      iconBtn('trash', 'Delete section', async () => {
        if (!(await confirmBox('Delete this section?', `“${sectionTitle(s)}” will be removed from the page. You can undo this.`, 'Delete', true))) return;
        page().sections.splice(i, 1);
        state.sel = page().sections.length ? Math.max(0, i - 1) : null;
        renderSidebar(); renderEditor(); changed({ full: true });
      }))));
  if (s.hidden) ed.append(h('p', { class: 'hint', style: 'margin:-12px 0 18px', text: 'This section is hidden from the website.' }));
  if (!t) { ed.append(h('p', { text: 'This section type can only be edited in the content file.' })); return; }
  const form = h('div');
  buildForm(t.fields, s, form);
  ed.append(form);
}

function renderSiteSettings(ed) {
  ed.append(h('div', { class: 'ed-head' }, h('div', {}, h('div', { class: 'ed-kicker', text: 'Whole website' }), h('h2', { text: 'Menu, footer and site name' }))));
  const form = h('div');
  buildForm(SITE_FIELDS, state.content.site, form);
  ed.append(form);
}

function renderPageSettings(ed) {
  const p = page();
  const isHome = p.slug === 'home';
  ed.append(h('div', { class: 'ed-head' }, h('div', {}, h('div', { class: 'ed-kicker', text: 'Page settings' }), h('h2', { text: p.title }))));
  const form = h('div');
  buildForm(PAGE_FIELDS, p, form);
  if (!isHome) {
    // web address
    const id = 'f' + (++uid);
    const input = h('input', { id, type: 'text', value: p.slug });
    input.addEventListener('change', () => {
      const old = p.slug;
      let slug = slugify(input.value) || old;
      if (slug !== old && state.content.pages.some(x => x.slug === slug)) { toast('Another page already uses that address.', 'err'); slug = old; }
      input.value = slug;
      if (slug === old) return;
      p.slug = slug;
      state.pageSlug = slug;
      state.content = JSON.parse(json().split(`"?p=${old}"`).join(`"?p=${slug}"`));
      renderSidebar(); renderEditor(); changed({ full: true });
    });
    form.append(h('div', { class: 'f' }, h('label', { for: id, text: 'Web address' }), input,
      h('p', { class: 'hint', text: `The page opens at …/?p=${p.slug}. Changing it updates the menu and buttons that link here.` })));

    // show in menu
    const link = `?p=${p.slug}`;
    const inNav = state.content.site.nav.some(l => l.link === link);
    const tid = 'f' + (++uid);
    const cb = h('input', { id: tid, type: 'checkbox', checked: inNav });
    cb.addEventListener('change', () => {
      const nav = state.content.site.nav;
      if (cb.checked) nav.push({ label: p.title, link });
      else state.content.site.nav = nav.filter(l => l.link !== link);
      changed();
    });
    form.append(h('div', { class: 'f f-toggle' }, h('label', { for: tid, text: 'Show in the top menu' }), h('span', { class: 'switch' }, cb, h('span'))));

    form.append(h('div', { style: 'margin-top:28px' }, h('button', {
      class: 'btn danger', type: 'button', text: 'Delete this page',
      onclick: async () => {
        if (!(await confirmBox('Delete this page?', `“${p.title}” and all its sections will be removed. You can undo this.`, 'Delete page', true))) return;
        state.content.pages = state.content.pages.filter(x => x !== p);
        state.content.site.nav = state.content.site.nav.filter(l => l.link !== link);
        switchPage('home');
        changed({ full: true });
      }
    })));
  } else {
    form.append(h('p', { class: 'hint', text: 'This is the home page. To change the browser tab title, open “Menu, footer and site name”.' }));
  }
  ed.append(form);
}

// ---------- form builder ----------
function buildForm(fields, obj, container) {
  const basic = fields.filter(f => !f.advanced);
  const adv = fields.filter(f => f.advanced);
  basic.forEach(f => container.append(field(f, obj)));
  if (adv.length) {
    const d = h('details', { class: 'advanced' }, h('summary', { text: 'More options' }));
    adv.forEach(f => d.append(field(f, obj)));
    container.append(d);
  }
}

function field(f, obj) {
  const id = 'f' + (++uid);
  const wrap = h('div', { class: 'f f-' + f.type });
  const hint = f.hint ? h('p', { class: 'hint', text: f.hint }) : null;
  const set = v => { obj[f.key] = v; changed(); };

  switch (f.type) {
    case 'text': case 'heading': case 'link': {
      const input = h('input', { id, type: 'text', value: obj[f.key] ?? '', list: f.type === 'link' ? 'link-options' : null,
        placeholder: f.type === 'link' ? 'Pick a section or page, or paste a web address' : null });
      input.addEventListener('input', () => set(input.value));
      wrap.append(h('label', { for: id, text: f.label }), input);
      break;
    }
    case 'textarea': case 'richtext': {
      const ta = h('textarea', { id, rows: f.rows || (f.type === 'richtext' ? 6 : 3) });
      ta.value = obj[f.key] ?? '';
      ta.addEventListener('input', () => set(ta.value));
      wrap.append(h('label', { for: id, text: f.label }), ta);
      break;
    }
    case 'select': {
      const sel = h('select', { id }, f.options.map(([v, l]) => h('option', { value: v, text: l })));
      sel.value = obj[f.key] ?? f.options[0][0];
      sel.addEventListener('change', () => set(sel.value));
      wrap.append(h('label', { for: id, text: f.label }), sel);
      break;
    }
    case 'toggle': {
      const cb = h('input', { id, type: 'checkbox', checked: !!obj[f.key] });
      cb.addEventListener('change', () => set(cb.checked));
      wrap.append(h('label', { for: id, text: f.label }), h('span', { class: 'switch' }, cb, h('span')));
      break;
    }
    case 'media': case 'image':
      wrap.append(h('span', { class: 'f-label', text: f.label }), mediaField(f, obj));
      break;
    case 'list':
      wrap.append(h('span', { class: 'f-label', text: f.label }), listField(f, obj));
      break;
    case 'group': {
      obj[f.key] = obj[f.key] || {};
      const fs = h('fieldset', { class: 'group' }, h('legend', { text: f.label }));
      buildForm(f.fields, obj[f.key], fs);
      wrap.append(fs);
      break;
    }
  }
  if (hint) wrap.append(hint);
  return wrap;
}

// Photo / video picker
function mediaField(f, obj) {
  const box = h('div', { class: 'media-field' });
  const accept = f.type === 'image' ? 'image/*' : f.accept === 'video' ? 'video/*' : 'image/*,video/*';
  const noun = f.type === 'image' ? 'photo' : f.accept === 'video' ? 'video' : 'photo or video';

  const draw = () => {
    box.innerHTML = '';
    const v = obj[f.key] || '';
    const fileInput = h('input', { type: 'file', accept, hidden: true });
    fileInput.addEventListener('change', () => fileInput.files[0] && upload(fileInput.files[0]));

    if (v) {
      const yt = youtubeId(v);
      const thumb = h('div', { class: 'media-thumb' });
      if (yt) thumb.style.backgroundImage = `url("https://i.ytimg.com/vi/${yt}/default.jpg")`;
      else if (isVideo(v)) thumb.append(h('video', { src: mediaUrl(v), muted: true, playsinline: true, preload: 'metadata' }));
      else thumb.style.backgroundImage = `url("${mediaUrl(v).replace(/"/g, '%22')}")`;
      if (yt || /vimeo/.test(v)) thumb.append('▶');
      const name = yt ? 'YouTube video' : /vimeo/.test(v) ? 'Vimeo video' : v.split('/').pop();
      box.append(h('div', { class: 'media-current' }, thumb,
        h('div', { class: 'media-info' },
          h('div', { class: 'media-name', title: v, text: name }),
          h('div', { class: 'media-kind', text: state.uploads[v] ? 'New upload, publishes with your changes' : (isVideo(v) ? 'Video' : 'Photo') }),
          h('div', { class: 'media-btns' },
            h('button', { type: 'button', text: 'Replace', onclick: () => fileInput.click() }),
            h('button', { type: 'button', class: 'rm', text: 'Remove', onclick: () => { obj[f.key] = ''; changed(); draw(); } })))));
    } else {
      const drop = h('div', { class: 'drop', tabindex: '0', role: 'button', html: `Drop a ${noun} here or <b>choose a file</b>` });
      drop.onclick = () => fileInput.click();
      drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } };
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]); };
      box.append(drop);
    }
    if (f.type !== 'image') {
      const urlInput = h('input', { type: 'text', placeholder: f.accept === 'video' ? 'or paste a YouTube link' : 'or paste a YouTube or photo link', value: v && !state.uploads[v] && /^https?:/.test(v) ? v : '' });
      urlInput.addEventListener('change', () => { obj[f.key] = urlInput.value.trim(); changed(); draw(); });
      box.append(h('div', { class: 'or-link' }, urlInput));
    }
    box.append(fileInput);
  };

  async function upload(file) {
    box.append(h('div', { class: 'uploading', text: 'Preparing…' }));
    try {
      obj[f.key] = await addUpload(file, accept);
      changed();
    } catch (err) {
      toast(String(err.message || err), 'err', 6000);
    }
    draw();
  }

  draw();
  return box;
}

async function addUpload(file, accept = 'image/*,video/*') {
  const isImg = file.type.startsWith('image/'), isVid = file.type.startsWith('video/');
  if ((!isImg && !isVid) || (isImg && !accept.includes('image')) || (isVid && !accept.includes('video'))) {
    throw new Error(`Please choose a ${accept.includes('image') && accept.includes('video') ? 'photo or video' : accept.includes('video') ? 'video' : 'photo'} file.`);
  }
  if (isVid && file.size > config.maxVideoMB * 1e6) {
    throw new Error(`That video is ${Math.round(file.size / 1e6)} MB. Videos over ${config.maxVideoMB} MB are too big for the website: upload it to YouTube, then paste the YouTube link here.`);
  }
  let blob = file;
  let ext = (file.name.split('.').pop() || '').toLowerCase();
  if (isImg && !/gif|svg/.test(file.type)) {
    blob = await resizeImage(file);
    if (blob !== file) ext = 'jpg';
  }
  if (isImg && blob.size > config.maxUploadMB * 1e6) throw new Error('That photo is too large. Please choose a smaller one.');
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'upload';
  const path = `${config.uploadDir}/${Date.now().toString(36)}-${base}.${ext || 'bin'}`;
  state.uploads[path] = blob;
  state.blobUrls[path] = URL.createObjectURL(blob);
  return path;
}

async function resizeImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return file; }
  const max = config.maxImageSide;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 900 * 1024 && /jpeg|png|webp/.test(file.type)) return file;
  // otherwise re-encode as a smaller JPEG
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const toJpeg = q => new Promise(res => canvas.toBlob(b => res(b || file), 'image/jpeg', q));
  let out = await toJpeg(0.86);
  for (const q of [0.75, 0.62, 0.5]) {
    if (out.size <= config.maxUploadMB * 1e6) break;
    out = await toJpeg(q);
  }
  return out;
}

// Repeating items (buttons, cards, work, gallery…)
const openItems = new WeakSet();
function listField(f, obj) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const box = h('div', { class: 'list' });

  const draw = () => {
    box.innerHTML = '';
    const arr = obj[f.key];
    arr.forEach((item, i) => {
      const mediaKey = f.fields.find(x => x.type === 'media' || x.type === 'image');
      const thumbSrc = () => {
        const v = (mediaKey && item[mediaKey.key]) || item.image || item.video || '';
        const yt = youtubeId(v);
        return yt ? `https://i.ytimg.com/vi/${yt}/default.jpg` : v && !isVideo(v) ? mediaUrl(v) : '';
      };
      const thumb = mediaKey ? h('span', { class: 'li-thumb' }) : null;
      const title = h('span', { class: 'li-title' });
      const refresh = () => {
        title.textContent = item[f.titleKey] || `Untitled ${f.itemLabel}`;
        if (thumb) { const t = thumbSrc(); thumb.style.backgroundImage = t ? `url("${t.replace(/"/g, '%22')}")` : ''; }
      };
      refresh();
      const stop = fn => e => { e.preventDefault(); e.stopPropagation(); fn(); };
      const details = h('details', { class: 'list-item', open: openItems.has(item) },
        h('summary', {}, thumb, title, h('span', { class: 'li-actions' },
          i > 0 && iconBtn('up', 'Move up', stop(() => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); changed(); draw(); })),
          i < arr.length - 1 && iconBtn('down', 'Move down', stop(() => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); changed(); draw(); })),
          iconBtn('trash', `Remove ${f.itemLabel}`, stop(() => { arr.splice(i, 1); changed(); draw(); })))));
      details.addEventListener('toggle', () => { details.open ? openItems.add(item) : openItems.delete(item); });
      const body = h('div', { class: 'li-body' });
      buildForm(f.fields, item, body);
      body.addEventListener('input', refresh);
      body.addEventListener('change', refresh);
      body.addEventListener('click', () => setTimeout(refresh, 50));
      details.append(body);
      box.append(details);
    });

    const add = h('div', { class: 'list-add' }, h('button', {
      class: 'add-btn', type: 'button', text: `+ Add ${f.itemLabel}`,
      onclick: () => {
        const item = f.newItem();
        f.newFirst ? arr.unshift(item) : arr.push(item);
        openItems.add(item);
        changed(); draw();
      }
    }));
    if (f.multiUpload) {
      const multi = h('input', { type: 'file', accept: 'image/*,video/*', multiple: true, hidden: true });
      multi.addEventListener('change', async () => {
        let added = 0;
        for (const file of multi.files) {
          try { arr.push({ ...f.newItem(), [f.multiUpload]: await addUpload(file) }); added++; }
          catch (err) { toast(`${file.name}: ${err.message}`, 'err', 6000); }
        }
        if (added) { changed(); draw(); toast(`Added ${added} file${added > 1 ? 's' : ''}.`); }
      });
      add.append(h('button', { class: 'add-btn', type: 'button', text: '⇪ Upload several', onclick: () => multi.click() }), multi);
    }
    box.append(add);
  };
  draw();
  return box;
}

function updateLinkOptions() {
  const dl = $('#link-options');
  dl.innerHTML = '';
  const home = state.content.pages.find(p => p.slug === 'home');
  (home?.sections || []).filter(s => s.anchor).forEach(s =>
    dl.append(h('option', { value: '#' + s.anchor, label: `Home page: ${sectionTitle(s)}` })));
  state.content.pages.filter(p => p.slug !== 'home').forEach(p =>
    dl.append(h('option', { value: '?p=' + p.slug, label: `Page: ${p.title}` })));
  dl.append(h('option', { value: './', label: 'Home page' }));
}

// ---------- dialogs ----------
function modal(build) {
  const dlg = $('#modal');
  dlg.innerHTML = '';
  const body = h('div', { class: 'modal-body' });
  dlg.append(body);
  return new Promise(resolve => {
    const close = v => { dlg.close(); resolve(v); };
    build(body, close);
    dlg.onclose = () => resolve(undefined);
    dlg.onclick = e => { if (e.target === dlg) close(undefined); };
    dlg.showModal();
  });
}

function confirmBox(title, text, okLabel, danger = false) {
  return modal((body, close) => {
    body.append(h('h3', { text: title }), h('p', { text }),
      h('div', { class: 'modal-foot' },
        h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => close(false) }),
        h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), type: 'button', text: okLabel, onclick: () => close(true) })));
  }).then(Boolean);
}

async function addSectionDialog() {
  const type = await modal((body, close) => {
    body.append(h('h3', { text: 'Add a section' }), h('p', { text: 'Choose what kind of section to add. You can change everything in it afterwards.' }),
      h('div', { class: 'type-grid' }, Object.entries(SECTION_TYPES).map(([key, t]) =>
        h('button', { class: 'type-card', type: 'button', onclick: () => close(key) },
          h('span', { class: 'si-icon', text: t.icon }), h('span', {}, h('b', { text: t.label }), h('small', { text: t.description }))))),
      h('div', { class: 'modal-foot' }, h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => close() })));
  });
  if (!type) return;
  const secs = page().sections;
  const at = typeof state.sel === 'number' ? state.sel + 1 : secs.length;
  secs.splice(at, 0, SECTION_TYPES[type].create());
  state.sel = at;
  renderSidebar(); renderEditor();
  changed({ full: true });
  sendPreview({ scrollTo: at });
  setTab('edit');
}
$('#add-section').onclick = addSectionDialog;

$('#add-page').onclick = async () => {
  const result = await modal((body, close) => {
    const title = h('input', { type: 'text', id: 'np-title', placeholder: 'e.g. Documentaries', required: true });
    const starter = h('select', { id: 'np-start' },
      h('option', { value: 'text', text: 'Heading and text' }),
      h('option', { value: 'gallery', text: 'Photo gallery' }),
      h('option', { value: 'work', text: 'Stories and videos' }),
      h('option', { value: 'video', text: 'One big video' }),
      h('option', { value: 'hero', text: 'Big headline with photo' }),
      h('option', { value: 'blank', text: 'Empty page' }));
    const nav = h('input', { type: 'checkbox', id: 'np-nav', checked: true });
    const err = h('p', { class: 'error' });
    const submit = () => {
      const t = title.value.trim();
      if (!t) { err.textContent = 'Give the page a name.'; title.focus(); return; }
      close({ title: t, starter: starter.value, nav: nav.checked });
    };
    title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    body.append(h('h3', { text: 'New page' }), h('p', { text: 'Add a page for documentaries, photography, a full biography, or anything else.' }),
      h('div', { class: 'f' }, h('label', { for: 'np-title', text: 'Page name' }), title),
      h('div', { class: 'f' }, h('label', { for: 'np-start', text: 'Start with' }), starter),
      h('div', { class: 'f f-toggle' }, h('label', { for: 'np-nav', text: 'Show in the top menu' }), h('span', { class: 'switch' }, nav, h('span'))),
      err,
      h('div', { class: 'modal-foot' },
        h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => close() }),
        h('button', { class: 'btn primary', type: 'button', text: 'Create page', onclick: submit })));
    setTimeout(() => title.focus(), 50);
  });
  if (!result) return;
  let slug = slugify(result.title) || 'page';
  if (slug === 'home') slug = 'home-page';
  const base = slug; let n = 2;
  while (state.content.pages.some(p => p.slug === slug)) slug = `${base}-${n++}`;

  const sections = [];
  if (result.starter !== 'blank') {
    const s = SECTION_TYPES[result.starter].create();
    if (result.starter === 'text' || result.starter === 'hero') s.heading = result.title + '.';
    else {
      s.heading = '';
      sections.push({ ...SECTION_TYPES.text.create(), heading: result.title + '.', body: 'Write an introduction for this page.' });
    }
    sections.push(s);
  }
  state.content.pages.push({ slug, title: result.title, description: '', sections });
  if (result.nav) state.content.site.nav.push({ label: result.title, link: `?p=${slug}` });
  switchPage(slug);
  changed({ full: true });
  toast(`Page “${result.title}” created.`);
};

// ---------- publish ----------
$('#publish').onclick = async () => {
  recordHistory.flush();
  if (state.mode === 'demo') return downloadContent();

  const used = Object.keys(state.uploads).filter(p => json().includes(JSON.stringify(p)));
  try {
    const head = await gh.headSha();
    if (head !== state.headSha && !(await confirmBox('The website changed somewhere else',
      'Someone updated the website since you opened the editor. Publishing will replace those content changes with yours.', 'Publish anyway'))) return;
  } catch (err) { return toast(`Couldn't reach GitHub: ${err.message}`, 'err', 6000); }

  const dlg = $('#modal');
  dlg.innerHTML = '';
  const label = h('span', { text: 'Publishing…' });
  dlg.append(h('div', { class: 'modal-body' }, h('div', { class: 'progress' }, h('span', { class: 'spinner' }), label)));
  dlg.onclose = null; dlg.onclick = null;
  dlg.showModal();
  try {
    const uploads = used.map(path => ({ path, blob: state.uploads[path] }));
    state.headSha = await gh.publish(state.content, uploads, `Update website from the editor`, msg => { label.textContent = msg; });
    state.published = json();
    state.uploads = {};
    await clearDraft();
    dlg.close();
    updateStatus();
    toast('Published. The website will show your changes in about a minute.', '', 6000);
  } catch (err) {
    dlg.close();
    toast(err.status === 401 ? 'You were signed out. Your changes are saved; sign in again, then press Publish.' : `Publishing failed: ${err.message}`, 'err', 8000);
  }
};

function downloadContent() {
  const blob = new Blob([JSON.stringify(state.content, null, 2) + '\n'], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'site.json' });
  document.body.append(a); a.click(); a.remove();
  toast('Practice mode can’t publish. Sign in to save changes to the website.', '', 6000);
}
