// Site Info — returns site identity for usage-gate calls
// GET → { repo: 'owner/repo-name' }

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const repo = process.env.GITHUB_REPO;
  if (!repo) {
    return res.status(500).json({ error: 'GITHUB_REPO not configured' });
  }

  return res.status(200).json({ repo });
};
