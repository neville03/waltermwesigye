document.documentElement.classList.add('js');

// Footer year
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// Mobile menu
const menuBtn = document.querySelector('.menu-btn');
const menu = document.getElementById('menu');
const setMenu = open => {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Work filters
const filters = document.querySelectorAll('.filter');
const items = document.querySelectorAll('.work .item');
filters.forEach(btn => btn.addEventListener('click', () => {
  filters.forEach(b => b.classList.toggle('active', b === btn));
  const f = btn.dataset.filter;
  items.forEach(item => { item.hidden = f !== 'all' && item.dataset.type !== f; });
}));

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add('in'));
}

// Booking form
const form = document.getElementById('booking');
if (form) {
  const status = form.querySelector('.status');
  const submit = form.querySelector('button[type="submit"]');
  const setStatus = (msg, kind) => { status.textContent = msg; status.className = 'status' + (kind ? ' ' + kind : ''); };

  form.querySelectorAll('input, textarea').forEach(el =>
    el.addEventListener('input', () => el.classList.remove('invalid')));

  form.addEventListener('submit', async e => {
    e.preventDefault();
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
}
