// Shared helpers for the editor's server functions (files starting with _ are not routes).
//
// Environment variables (Vercel > Settings > Environment Variables):
//   ADMIN_PASSWORD   password Walter types to sign in to /admin
//   GITHUB_TOKEN     fine-grained GitHub token for this repo with "Contents: Read and write"
//   GITHUB_REPO      optional, defaults to neville03/waltermwesigye
//   GITHUB_BRANCH    optional, defaults to main (must be Vercel's production branch)
const crypto = require('crypto');

const COOKIE = 'wm_session';
const SESSION_DAYS = 30;

const env = () => ({
  password: process.env.ADMIN_PASSWORD || '',
  token: process.env.GITHUB_TOKEN || '',
  repo: process.env.GITHUB_REPO || 'neville03/waltermwesigye',
  branch: process.env.GITHUB_BRANCH || 'main',
  api: process.env.GITHUB_API_URL || 'https://api.github.com'
});

function missingConfig() {
  const e = env();
  const missing = [];
  if (!e.password) missing.push('ADMIN_PASSWORD');
  if (!e.token) missing.push('GITHUB_TOKEN');
  return missing;
}

// Sessions are signed with a key derived from the password and token,
// so changing the password signs everyone out.
const key = () => crypto.createHash('sha256').update(`wm-editor|${env().password}|${env().token}`).digest();
const sign = data => crypto.createHmac('sha256', key()).update(data).digest('base64url');

function makeSession() {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const data = `${exp}.${crypto.randomBytes(9).toString('base64url')}`;
  return `${data}.${sign(data)}`;
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

function validSession(req) {
  if (missingConfig().length) return false;
  const value = readCookie(req, COOKIE);
  const i = value.lastIndexOf('.');
  if (i < 0) return false;
  const data = value.slice(0, i), sig = value.slice(i + 1);
  const expected = sign(data);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(data.split('.')[0]) > Date.now();
}

function sessionCookie(value, maxAge) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function passwordMatches(given) {
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(env().password).digest();
  return crypto.timingSafeEqual(a, b);
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Requests that change things must come from the editor page itself.
const fromEditor = req => req.headers['x-editor'] === '1';

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { env, missingConfig, makeSession, validSession, sessionCookie, passwordMatches, send, fromEditor, readBody, sleep, SESSION_DAYS };
