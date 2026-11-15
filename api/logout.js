// POST -> signs out of the editor.
const { sessionCookie, send } = require('./_lib');

module.exports = (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { message: 'Method not allowed' });
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  send(res, 200, { ok: true });
};
