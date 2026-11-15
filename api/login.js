// POST { password } -> signs in to the editor (sets a secure cookie).
const { missingConfig, makeSession, sessionCookie, passwordMatches, send, fromEditor, readBody, sleep, SESSION_DAYS } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed' });
  if (!fromEditor(req)) return send(res, 403, { message: 'Forbidden' });
  const missing = missingConfig();
  if (missing.length) {
    return send(res, 500, { message: `The editor isn't set up yet. Add ${missing.join(' and ')} in Vercel's Environment Variables, then redeploy.` });
  }
  let body;
  try { body = await readBody(req); } catch { return send(res, 400, { message: 'Bad request' }); }

  if (!passwordMatches(body.password)) {
    await sleep(1200); // slow down guessing
    return send(res, 401, { message: 'That password is not right.' });
  }
  res.setHeader('Set-Cookie', sessionCookie(makeSession(), SESSION_DAYS * 86400));
  send(res, 200, { ok: true });
};
