// Builds the site's HTML from content/site.json.
// Shared by the public site (js/main.js) and the editor's live preview.

let mediaMap = {};      // unsaved uploads from the editor: path -> blob URL
let animate = true;     // scroll-reveal animations (off in preview)

export const ICONS = {
  screen: '<path d="M4 5h16v11H4z"/><path d="M8 20h8M12 16v4"/>',
  'camera-video': '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'
};

export const WORK_TYPES = { video: 'Video', documentary: 'Documentary', photo: 'Photo', article: 'Article' };

// ---------- helpers ----------
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const safeUrl = u => {
  u = String(u ?? '').trim();
  return /^(javascript|data|vbscript):/i.test(u.replace(/\s+/g, '')) ? '#' : u;
};
// Resolve an image/video path, using the editor's unsaved upload if there is one.
const src = p => mediaMap[p] || safeUrl(p);
const attrUrl = p => esc(src(p));
const cssUrl = p => `url("${src(p).replace(/["\\\n\r]/g, c => '%' + c.charCodeAt(0).toString(16))}")`;

// *word* in headings becomes blue
const hl = s => esc(s).replace(/\*([^*]+)\*/g, '<span class="blue">$1</span>');

// Simple formatting for longer text: blank line = new paragraph, **bold**, [text](link)
const inline = s => esc(s)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${safeUrl(u)}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
const rich = s => String(s ?? '').trim().split(/\n\s*\n/).filter(Boolean)
  .map(p => `<p>${inline(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');

const linkAttrs = link => {
  const u = safeUrl(link) || '#';
  return `href="${esc(u)}"${/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : ''}`;
};

export const youtubeId = url => (String(url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/) || [])[1];
const vimeoId = url => (String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1];
export const isVideo = u => !!u && (!!youtubeId(u) || !!vimeoId(u) || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u));

export function videoEmbed(url, { autoplay = false } = {}) {
  const yt = youtubeId(url);
  if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0${autoplay ? '&autoplay=1' : ''}" title="Video" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`;
  const vm = vimeoId(url);
  if (vm) return `<iframe src="https://player.vimeo.com/video/${vm}${autoplay ? '?autoplay=1' : ''}" title="Video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  return `<video src="${attrUrl(url)}" controls playsinline preload="metadata"${autoplay ? ' autoplay' : ''}></video>`;
}

const mediaHtml = (url, alt, extra = '') => !url ? '' : isVideo(url)
  ? `<div class="video-frame">${videoEmbed(url)}</div>`
  : `<img src="${attrUrl(url)}" alt="${esc(alt)}" ${extra}>`;

const thumbFor = item => item.image || (youtubeId(item.video) ? `https://i.ytimg.com/vi/${youtubeId(item.video)}/hqdefault.jpg` : '');

const reveal = () => animate ? ' reveal' : '';
const anchor = s => s.anchor ? ` id="${esc(s.anchor)}"` : '';

const buttons = list => (list || []).filter(b => b.label).length
  ? `<div class="ctas">${list.filter(b => b.label).map(b =>
      `<a class="btn ${b.style === 'secondary' ? 'secondary' : 'primary'}" ${linkAttrs(b.link)}>${esc(b.label)}</a>`).join('')}</div>`
  : '';

const head = (s, right = '') => (s.heading || s.intro || right)
  ? `<div class="section-head${reveal()}">${s.heading ? `<h2>${hl(s.heading)}</h2>` : '<span></span>'}${right || (s.intro ? `<p>${esc(s.intro)}</p>` : '')}</div>`
  : '';

// ---------- section templates ----------
export const SECTIONS = {
  hero: s => `
    <section class="hero"${anchor(s)}>
      <div class="wrap hero-grid${s.media ? '' : ' no-media'}">
        <div class="hero-text">
          ${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}
          <h1>${hl(s.heading)}</h1>
          ${s.text ? `<p class="sub">${esc(s.text)}</p>` : ''}
          ${buttons(s.buttons)}
        </div>
        ${s.media ? `<div class="portrait">${isVideo(s.media)
          ? `<div class="video-frame">${videoEmbed(s.media)}</div>`
          : `<img src="${attrUrl(s.media)}" alt="${esc(s.mediaAlt)}" fetchpriority="high">`}</div>` : ''}
      </div>
    </section>`,

  statement: s => `
    <section class="statement"${anchor(s)}>
      <div class="wrap"><p class="${reveal().trim()}">${esc(s.text)}${s.muted ? ` <span>${esc(s.muted)}</span>` : ''}</p></div>
    </section>`,

  stats: s => `
    <section class="stats-section"${anchor(s)}>
      <div class="wrap stats">
        ${(s.items || []).map(i => `<div class="stat${reveal()}"><b>${esc(i.value)}</b><span>${esc(i.label)}</span></div>`).join('')}
      </div>
    </section>`,

  services: s => `
    <section class="section"${anchor(s)}>
      <div class="wrap">
        ${head(s)}
        <div class="bento">
          ${(s.items || []).map(i => `
            <article class="card size-${esc(i.size || 'half')}${i.highlight ? ' feature' : ''}${reveal()}">
              ${i.image ? `<img class="card-img" src="${attrUrl(i.image)}" alt="" loading="lazy">` : `<div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[i.icon] || ICONS.star}</svg></div>`}
              <div>
                <h3>${esc(i.title)}</h3>
                ${i.text ? `<p>${esc(i.text)}</p>` : ''}
                ${i.tags ? `<div class="beats">${String(i.tags).split(',').map(t => t.trim()).filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
              </div>
            </article>`).join('')}
        </div>
      </div>
    </section>`,

  work: s => {
    const items = s.items || [];
    const types = [...new Set(items.map(i => i.type).filter(Boolean))];
    const filters = s.filters && types.length > 1
      ? `<div class="filters" role="group" aria-label="Filter work"><button class="filter active" data-filter="all">All</button>${types.map(t => `<button class="filter" data-filter="${esc(t)}">${esc(WORK_TYPES[t] || t)}</button>`).join('')}</div>`
      : '';
    return `
    <section class="section"${anchor(s)}>
      <div class="wrap">
        ${head(s, filters)}
        <div class="work">
          ${items.map(i => {
            const thumb = thumbFor(i);
            const playable = !!i.video;
            const open = playable ? `href="#" data-lightbox="${esc(i.video)}"` : linkAttrs(i.link || '#');
            return `
            <a class="item${reveal()}" data-type="${esc(i.type)}" ${open}>
              <div class="thumb"${thumb ? ` style="background-image:${esc(cssUrl(thumb))}"` : ''}>
                <span class="type">${esc(WORK_TYPES[i.type] || i.type || 'Work')}</span>
                ${playable || i.type === 'video' || i.type === 'documentary' ? '<div class="play"></div>' : ''}
              </div>
              ${i.meta ? `<span class="meta">${esc(i.meta)}</span>` : ''}
              <h3>${esc(i.title)}</h3>
              ${i.text ? `<p>${esc(i.text)}</p>` : ''}
            </a>`;
          }).join('')}
        </div>
      </div>
    </section>`;
  },

  feature: s => `
    <section class="section"${anchor(s)}>
      <div class="wrap">
        <div class="rec${s.flip ? ' flip' : ''}${s.media ? '' : ' no-media'}${reveal()}">
          ${mediaHtml(s.media, s.mediaAlt, 'loading="lazy"')}
          <div class="t">
            ${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}
            ${s.heading ? `<h3>${hl(s.heading)}</h3>` : ''}
            ${s.text ? `<div class="rich">${rich(s.text)}</div>` : ''}
            ${s.link && s.linkLabel ? `<a class="link" ${linkAttrs(s.link)}>${esc(s.linkLabel)}</a>` : ''}
          </div>
        </div>
      </div>
    </section>`,

  text: s => `
    <section class="section text-section${s.align === 'center' ? ' center' : ''}"${anchor(s)}>
      <div class="wrap${reveal()}">
        ${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}
        ${s.heading ? `<h2>${hl(s.heading)}</h2>` : ''}
        <div class="rich">${rich(s.body)}</div>
        ${buttons(s.buttons)}
      </div>
    </section>`,

  gallery: s => `
    <section class="section"${anchor(s)}>
      <div class="wrap">
        ${head(s)}
        <div class="gallery cols-${esc(s.columns || '3')}">
          ${(s.items || []).filter(i => i.media).map(i => {
            const vid = isVideo(i.media);
            const thumb = vid ? (youtubeId(i.media) ? `https://i.ytimg.com/vi/${youtubeId(i.media)}/hqdefault.jpg` : '') : i.media;
            return `
            <figure class="${reveal().trim()}">
              <a href="#" data-lightbox="${esc(i.media)}" data-caption="${esc(i.caption)}" aria-label="Open ${esc(i.caption || (vid ? 'video' : 'photo'))}">
                ${vid && !thumb ? `<div class="gthumb video-only"><video src="${attrUrl(i.media)}" muted playsinline preload="metadata"></video><div class="play"></div></div>`
                  : `<div class="gthumb" style="background-image:${esc(cssUrl(thumb))}">${vid ? '<div class="play"></div>' : ''}</div>`}
              </a>
              ${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ''}
            </figure>`;
          }).join('')}
        </div>
      </div>
    </section>`,

  video: s => `
    <section class="section"${anchor(s)}>
      <div class="wrap">
        ${head(s)}
        ${s.url ? `<div class="video-block${reveal()}"><div class="video-frame">${videoEmbed(s.url)}</div></div>` : ''}
      </div>
    </section>`,

  contact: s => {
    const options = String(s.services || '').split('\n').map(o => o.trim()).filter(Boolean);
    const socials = (s.socials || []).filter(x => x.label && x.link);
    return `
    <section class="contact"${anchor(s)}>
      <div class="wrap${reveal()}">
        ${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}
        <h2>${hl(s.heading)}</h2>
        ${s.text ? `<p>${esc(s.text)}</p>` : ''}
        ${s.showForm ? `
        <form class="booking" id="booking" data-email="${esc(s.email)}" data-endpoint="${esc(s.formEndpoint)}" novalidate>
          ${options.length ? `
          <fieldset class="field full">
            <legend>What do you need?</legend>
            <div class="options">
              ${options.map((o, n) => `<label><input type="radio" name="service" value="${esc(o)}"${n === 0 ? ' checked' : ''}><span>${esc(o)}</span></label>`).join('')}
            </div>
          </fieldset>` : '<input type="hidden" name="service" value="General enquiry">'}
          <div class="field"><label for="f-name">Full name</label><input id="f-name" name="name" type="text" autocomplete="name" required></div>
          <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="f-phone">Phone or WhatsApp <span class="opt">Optional</span></label><input id="f-phone" name="phone" type="tel" autocomplete="tel"></div>
          <div class="field"><label for="f-org">Organisation <span class="opt">Optional</span></label><input id="f-org" name="organisation" type="text" autocomplete="organization"></div>
          <div class="field"><label for="f-date">Preferred date <span class="opt">Optional</span></label><input id="f-date" name="date" type="date"></div>
          <div class="field"><label for="f-location">Location <span class="opt">Optional</span></label><input id="f-location" name="location" type="text" placeholder="e.g. Kampala"></div>
          <div class="field full"><label for="f-message">Tell Walter about it</label><textarea id="f-message" name="message" rows="5" required placeholder="What's the story, project or event? Include any deadlines or budget."></textarea></div>
          <input class="hp" type="text" name="company_website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="form-foot full"><p class="status" role="status" aria-live="polite"></p><button class="btn primary" type="submit">Send request</button></div>
        </form>` : ''}
        ${s.email || s.whatsapp ? `
        ${s.showForm ? '<p class="direct">Prefer to reach out directly?</p>' : ''}
        <div class="ctas">
          ${s.email ? `<a class="btn ${s.showForm ? 'secondary' : 'primary'}" href="mailto:${esc(s.email)}">Email Walter</a>` : ''}
          ${s.whatsapp ? `<a class="btn secondary" href="https://wa.me/${esc(String(s.whatsapp).replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>` : ''}
        ${socials.length ? `<div class="socials">${socials.map(x => `<a ${linkAttrs(x.link)}>${esc(x.label)}</a>`).join('')}</div>` : ''}
      </div>
    </section>`;
  }
};

// ---------- page chrome ----------
function navHref(link, slug) {
  link = safeUrl(link) || '#';
  // In-page links point at the home page when you're on another page
  if (link.startsWith('#') && slug !== 'home') return './' + link;
  if (link === '?p=home') return './';
  return link;
}

function header(site, slug) {
  const links = (site.nav || []).filter(l => l.label);
  const btn = site.navButton && site.navButton.label ? site.navButton : null;
  const ext = l => /^https?:/i.test(l) ? ' target="_blank" rel="noopener"' : '';
  return `
    <div class="wrap">
      <a class="name" href="${slug === 'home' ? '#top' : './'}">${esc(site.name)}</a>
      <button class="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button>
      <nav id="menu">
        ${links.map(l => `<a href="${esc(navHref(l.link, slug))}"${ext(l.link)}>${esc(l.label)}</a>`).join('')}
        ${btn ? `<a class="btn primary" href="${esc(navHref(btn.link, slug))}"${ext(btn.link)}>${esc(btn.label)}</a>` : ''}
      </nav>
    </div>`;
}

const footer = site => {
  const fill = t => esc(String(t || '').replace('{year}', new Date().getFullYear()));
  return `<div class="wrap"><span>${fill(site.footerLeft)}</span><span>${fill(site.footerRight)}</span></div>`;
};

export function sectionHtml(s) {
  const t = SECTIONS[s.type];
  return t ? t(s) : '';
}

let lastSections = [];

/**
 * Render a page of the site into the document.
 * Only sections whose HTML changed are replaced, so videos don't reload while editing.
 */
export function renderSite(content, slug = 'home', opts = {}) {
  mediaMap = opts.media || {};
  animate = !opts.preview;
  const site = content.site || {};
  const page = (content.pages || []).find(p => p.slug === slug)
    || { slug, title: 'Page not found', sections: [{ type: 'text', heading: 'Page not found.', body: "This page doesn't exist. [Go to the home page](./)", align: 'center' }] };

  document.title = page.slug === 'home' ? (site.title || site.name) : `${page.title} | ${site.name}`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', page.description || site.description || '');

  document.getElementById('site-header').innerHTML = header(site, page.slug);
  document.getElementById('site-footer').innerHTML = footer(site);

  const main = document.getElementById('main');
  const visible = (page.sections || []).map((s, index) => ({ s, index })).filter(x => !x.s.hidden);
  const html = visible.map(({ s }) => sectionHtml(s));

  if (!opts.forceFull && html.length === lastSections.length && main.children.length === html.length) {
    html.forEach((h, n) => {
      if (h !== lastSections[n]) {
        const tmp = document.createElement('div');
        tmp.innerHTML = h.trim();
        main.children[n].replaceWith(tmp.firstElementChild || document.createElement('section'));
      }
    });
  } else {
    main.innerHTML = html.join('') || (opts.preview ? '<section class="section empty-page"><div class="wrap"><p>This page has no sections yet. Add one in the editor.</p></div></section>' : '');
  }
  lastSections = html;

  // Tag sections with their position in the page's list (used by the editor preview)
  [...main.children].forEach((el, n) => { if (visible[n]) el.dataset.sectionIndex = visible[n].index; });
  return page;
}
