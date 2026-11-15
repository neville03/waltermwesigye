// Talks to the website's server functions (api/), which hold the GitHub key.
// Walter only ever signs in with the password.
import config from './config.js';

async function call(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    credentials: 'same-origin',
    headers: { 'X-Editor': '1', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) }
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error((data && data.message) || (res.status === 404
      ? 'The editor’s server functions weren’t found. The site must be deployed on Vercel.'
      : res.statusText || 'Something went wrong'));
    err.status = res.status;
    throw err;
  }
  return data;
}

const gh = (path, opts) => call('/api/gh?path=' + encodeURIComponent(path), opts);

export const login = password => call('/api/login', { method: 'POST', body: JSON.stringify({ password }) });
export const logout = () => call('/api/logout', { method: 'POST' }).catch(() => {});
export async function signedIn() {
  const s = await call('/api/session');
  return !!s.signedIn;
}

const b64ToUtf8 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
const utf8ToB64 = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
export const blobToB64 = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

const refPath = () => `/git/ref/heads/${config.branch}`;

/** Latest published content and the commit it came from. */
export async function loadContent() {
  const ref = await gh(refPath());
  const file = await gh(`/contents/${config.contentPath}?ref=${ref.object.sha}`);
  return { content: JSON.parse(b64ToUtf8(file.content)), headSha: ref.object.sha };
}

/** Current commit on the branch, to spot changes made elsewhere since loading. */
export async function headSha() {
  return (await gh(refPath())).object.sha;
}

/**
 * Publish the content file plus any new uploads in a single commit.
 * uploads: [{ path, blob }]
 */
export async function publish(content, uploads, message, onProgress = () => {}) {
  const ref = await gh(refPath());
  const parent = await gh(`/git/commits/${ref.object.sha}`);

  const tree = [];
  let n = 0;
  for (const u of uploads) {
    onProgress(`Uploading ${++n} of ${uploads.length}…`);
    const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: await blobToB64(u.blob), encoding: 'base64' }) });
    tree.push({ path: u.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  onProgress('Saving changes…');
  const json = JSON.stringify(content, null, 2) + '\n';
  const contentBlob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: utf8ToB64(json), encoding: 'base64' }) });
  tree.push({ path: config.contentPath, mode: '100644', type: 'blob', sha: contentBlob.sha });

  const newTree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  const commit = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
  await gh(`/git/refs/heads/${config.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit.sha;
}
