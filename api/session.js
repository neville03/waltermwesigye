// GET -> is the editor signed in on this device?
const { validSession, missingConfig, send } = require('./_lib');

module.exports = (req, res) => {
  const missing = missingConfig();
  if (missing.length) return send(res, 500, { signedIn: false, message: `The editor isn't set up yet. Add ${missing.join(' and ')} in Vercel's Environment Variables, then redeploy.` });
  send(res, 200, { signedIn: validSession(req) });
};
