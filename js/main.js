import { renderSite, videoEmbed, isVideo, esc } from './render.js';

document.documentElement.classList.add('js');

const params = new URLSearchParams(location.search);
const PREVIEW = params.has('preview');
let currentSlug = params.get('p') || 'home';

// ---------- loading ----------
if (PREVIEW) {
  document.body.classList.add('preview-mode');
  // The editor sends draft content over postMessage (from an iframe or a popup window).
  const editor = window.parent !== window ? window.parent : window.opener;
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data) return;
    const msg = e.data;
    if (msg.type === 'content') {
      const pageChanged = msg.page && msg.page !== currentSlug;
      currentSlug = msg.page || currentSlug;
      const page = renderSite(msg.content, currentSlug, { preview: true, media: msg.media, forceFull: msg.forceFull || pageChanged });
      if (pageChanged) window.scrollTo(0, 0);
      afterRender();
      markSelected(msg.selected);
      if (msg.scrollTo != null) scrollToSection(msg.scrollTo);
      document.body.dataset.page = page.slug;
    } else if (msg.type === 'scrollTo') {
      markSelected(msg.index);
      scrollToSection(msg.index);
    }
  });
  editor && editor.postMessage({ type: 'preview-ready' }, location.origin);
} else {
  fetch('content/site.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(content => {
      renderSite(content, currentSlug);
      afterRender();
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    })
    .catch(() => {
      document.getElementById('main').innerHTML =
        '<section class="section"><div class="wrap"><p>Sorry, this page could not be loaded. Please refresh to try again.</p></div></section>';
    });
}

function afterRender() {
  setupReveal();
}

// ---------- preview helpers ----------
function sectionEl(index) {
  return document.querySelector(`#main > [data-section-index="${index}"]`);
}
function markSelected(index) {
  document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
  if (index != null) sectionEl(index)?.classList.add('is-selected');
}
function scrollToSection(index) {
  const el = sectionEl(index);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 70, behavior: 'smooth' });
}

if (PREVIEW) {
  // Clicking a section in the preview selects it in the editor; links don't navigate away.
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && !a.dataset.lightbox) {
      e.preventDefault();
      const href = a.getAttribute('href') || '';
      const target = window.parent !== window ? window.parent : window.opener;
      const page = href.match(/[?&]p=([\w-]+)/);
      if (page) target?.postMessage({ type: 'navigate', page: page[1] }, location.origin);
      else if (href === './') target?.postMessage({ type: 'navigate', page: 'home' }, location.origin);
      else if (href.startsWith('#') || href.startsWith('./#')) document.getElementById(href.split('#')[1])?.scrollIntoView({ behavior: 'smooth' });
    }
    const sec = e.target.closest('#main > [data-section-index]');
    if (sec && !e.target.closest('input, textarea, label, button, .filters')) {
      const target = window.parent !== window ? window.parent : window.opener;
      target?.postMessage({ type: 'select', index: Number(sec.dataset.sectionIndex) }, location.origin);
      markSelected(Number(sec.dataset.sectionIndex));
    }
  }, true);
}

// ---------- mobile menu ----------
const setMenu = open => {
  const menu = document.getElementById('menu');
  const btn = document.querySelector('.menu-btn');
  if (!menu || !btn) return;
  menu.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
document.addEventListener('click', e => {
  if (e.target.closest('.menu-btn')) setMenu(!document.getElementById('menu').classList.contains('open'));
  else if (e.target.closest('#menu a')) setMenu(false);
});

// ---------- work filters ----------
document.addEventListener('click', e => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  const section = btn.closest('section');
  section.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b === btn));
  const f = btn.dataset.filter;
  section.querySelectorAll('.work .item').forEach(item => { item.hidden = f !== 'all' && item.dataset.type !== f; });
});

// ---------- lightbox for videos and gallery images ----------
let lastFocus = null;
function openLightbox(url, caption) {
  closeLightbox();
  lastFocus = document.activeElement;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <button class="lb-close" aria-label="Close">×</button>
    <figure>
      ${isVideo(url) ? `<div class="video-frame">${videoEmbed(url, { autoplay: true })}</div>` : `<img src="${esc(url)}" alt="${esc(caption)}">`}
      ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}
    </figure>`;
  // blob URLs from the editor need resolving to the real preview source
  const media = box.querySelector('img, video');
  const origin = document.querySelector(`[data-lightbox="${CSS.escape(url)}"]`);
  const shown = origin?.querySelector('img, video');
  if (media && shown && shown.src && shown.src.startsWith('blob:')) media.src = shown.src;
  const bg = origin?.querySelector('[style*="background-image"]');
  if (media && media.tagName === 'IMG' && bg && bg.style.backgroundImage.includes('blob:')) media.src = bg.style.backgroundImage.slice(5, -2);
  document.body.appendChild(box);
  document.body.classList.add('no-scroll');
  box.querySelector('.lb-close').focus();
}
function closeLightbox() {
  const box = document.querySelector('.lightbox');
  if (!box) return;
  box.remove();
  document.body.classList.remove('no-scroll');
  lastFocus?.focus?.();
}
document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-lightbox]');
  if (trigger) { e.preventDefault(); openLightbox(trigger.dataset.lightbox, trigger.dataset.caption); return; }
  if (e.target.closest('.lb-close') || e.target.classList.contains('lightbox')) closeLightbox();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); setMenu(false); }
});

// ---------- scroll reveal ----------
let io;
function setupReveal() {
  const reveals = document.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) { reveals.forEach(el => el.classList.add('in')); return; }
  io?.disconnect();
  io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => io.observe(el));
}

// ---------- booking form ----------
document.addEventListener('input', e => { if (e.target.closest('#booking')) e.target.classList.remove('invalid'); });

document.addEventListener('submit', async e => {
  const form = e.target;
  if (form.id !== 'booking') return;
  e.preventDefault();
  const status = form.querySelector('.status');
  const submit = form.querySelector('button[type="submit"]');
  const setStatus = (msg, kind) => { status.textContent = msg; status.className = 'status' + (kind ? ' ' + kind : ''); };

  if (PREVIEW) { setStatus('This is a preview, so nothing was sent.', 'ok'); return; }
  if (form.company_website.value) return; // spam trap

  const required = [...form.querySelectorAll('[required]')];
  const bad = required.filter(el => !el.value.trim() || !el.checkValidity());
  required.forEach(el => el.classList.toggle('invalid', bad.includes(el)));
  if (bad.length) {
    setStatus('Please fill in your name, a valid email and a message.', 'err');
    bad[0].focus();
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  delete data.company_website;
  const endpoint = form.dataset.endpoint;

  if (endpoint) {
    submit.disabled = true;
    setStatus('Sending…');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, _subject: `Booking request: ${data.service}` })
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      setStatus('Thank you. Your request has been sent and Walter will be in touch.', 'ok');
    } catch {
      setStatus('Something went wrong. Please try again, or use email or WhatsApp below.', 'err');
    } finally {
      submit.disabled = false;
    }
    return;
  }

  // No form service configured: open the visitor's email app with the request filled in.
  const optional = [
    ['Phone / WhatsApp', data.phone],
    ['Organisation', data.organisation],
    ['Preferred date', data.date],
    ['Location', data.location]
  ].filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
  const lines = [
    `Request: ${data.service}`,
    `Name: ${data.name.trim()}`,
    `Email: ${data.email.trim()}`,
    ...optional,
    '',
    data.message.trim()
  ];
  const subject = `Booking request: ${data.service}`;
  window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  setStatus('Your email app should open with the request ready to send.', 'ok');
});
