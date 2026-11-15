// Minimal GitHub API client: read the content file and publish changes as one commit.
import config from './config.js';

const API = 'https://api.github.com';
const TOKEN_KEY = 'wm-editor-token';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = t => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

async function gh(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${getToken()}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {})
    }
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).message || msg; } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const repo = `/repos/${config.owner}/${config.repo}`;

/** Check the token works and can write to the repository. */
export async function verify() {
  const info = await gh(repo);
  if (!info.permissions || !info.permissions.push) {
    throw new Error('This token can read the website but not change it. Give it “Contents: Read and write” access.');
  }
  try {
    await gh(`${repo}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  } catch (e) {
    if (e.status === 404) throw new Error(`The “${config.branch}” branch doesn't exist in the repository yet.`);
    throw e;
  }
  return info;
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

/** Latest published content and the commit it came from. */
export async function loadContent() {
  const ref = await gh(`${repo}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const file = await gh(`${repo}/contents/${config.contentPath}?ref=${ref.object.sha}`);
  return { content: JSON.parse(b64ToUtf8(file.content)), headSha: ref.object.sha };
}

/** Current commit on the branch, to spot changes made elsewhere since loading. */
export async function headSha() {
  const ref = await gh(`${repo}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  return ref.object.sha;
}

/**
 * Publish the content file plus any new uploads in a single commit.
 * uploads: [{ path, blob }]
 */
export async function publish(content, uploads, message, onProgress = () => {}) {
  const ref = await gh(`${repo}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const parent = await gh(`${repo}/git/commits/${ref.object.sha}`);

  const tree = [];
  let n = 0;
  for (const u of uploads) {
    onProgress(`Uploading ${++n} of ${uploads.length}…`);
    const blob = await gh(`${repo}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: await blobToB64(u.blob), encoding: 'base64' }) });
    tree.push({ path: u.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  onProgress('Saving changes…');
  const json = JSON.stringify(content, null, 2) + '\n';
  const contentBlob = await gh(`${repo}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: utf8ToB64(json), encoding: 'base64' }) });
  tree.push({ path: config.contentPath, mode: '100644', type: 'blob', sha: contentBlob.sha });

  const newTree = await gh(`${repo}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  const commit = await gh(`${repo}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
  await gh(`${repo}/git/refs/heads/${encodeURIComponent(config.branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
  return commit.sha;
}
