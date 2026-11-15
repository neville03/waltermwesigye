// Passes the editor's GitHub requests through with the server's token,
// limited to exactly what publishing needs on this one repository and branch.
//   /api/gh?path=/git/ref/heads/main   etc.
const { env, validSession, send, fromEditor, readBody } = require('./_lib');

function allowed(method, path, body, branch) {
  const b = branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (method === 'GET') {
    return new RegExp(`^/git/ref/heads/${b}$`).test(path)
      || /^\/git\/commits\/[0-9a-f]{40}$/.test(path)
      || /^\/contents\/content\/site\.json(\?ref=[0-9a-f]{40})?$/.test(path);
  }
  if (method === 'POST') return ['/git/blobs', '/git/trees', '/git/commits'].includes(path);
  if (method === 'PATCH') return new RegExp(`^/git/refs/heads/${b}$`).test(path) && body && !body.force;
  return false;
}

module.exports = async (req, res) => {
  if (!validSession(req)) return send(res, 401, { message: 'Please sign in again.' });
  if (req.method !== 'GET' && !fromEditor(req)) return send(res, 403, { message: 'Forbidden' });

  const { token, repo, branch, api } = env();
  const path = String(req.query?.path ?? new URL(req.url, 'http://x').searchParams.get('path') ?? '');
  let body;
  if (req.method !== 'GET') {
    try { body = await readBody(req); } catch { return send(res, 400, { message: 'Bad request' }); }
  }
  if (!allowed(req.method, path, body, branch)) return send(res, 403, { message: 'That action is not allowed.' });

  // Uploaded files may only go into the uploads folder (plus the content file itself).
  if (path === '/git/trees') {
    const ok = Array.isArray(body.tree) && body.tree.every(t =>
      t.mode === '100644' && t.type === 'blob' &&
      (t.path === 'content/site.json' || /^assets\/uploads\/[\w.-]+$/.test(t.path)));
    if (!ok) return send(res, 403, { message: 'Files can only be saved to the uploads folder.' });
  }

  const gh = await fetch(`${api}/repos/${repo}${path}`, {
    method: req.method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wm-site-editor',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await gh.text();
  res.statusCode = gh.status === 401 ? 502 : gh.status;  // a bad server token is not the user's fault
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (gh.status === 401) return res.end(JSON.stringify({ message: 'The website’s GitHub key (GITHUB_TOKEN) has expired or is wrong. Update it in Vercel.' }));
  res.end(text);
};
