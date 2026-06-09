// Memory API — read/manage agent personality memory
// GET → returns current memory state
// DELETE → resets memory to defaults (requires auth)

const MEMORY_PATH = '.buildmysite/memory.json';

const DEFAULT_MEMORY = {
  version: 1,
  created: new Date().toISOString(),
  interaction_count: 0,
  preferences: { style: [], content: [], design: [], business: [] },
  corrections: [],
  personality: { name: null, greeting: null }
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!ghToken || !repo) {
    return res.status(500).json({ error: 'GitHub not configured' });
  }

  const headers = {
    'Authorization': `Bearer ${ghToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  if (req.method === 'GET') {
    try {
      const r = await fetch(
        `https://api.github.com/repos/${repo}/contents/${MEMORY_PATH}?ref=${branch}`,
        { headers }
      );
      if (!r.ok) {
        return res.status(200).json(DEFAULT_MEMORY);
      }
      const data = await r.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return res.status(200).json(JSON.parse(content));
    } catch {
      return res.status(200).json(DEFAULT_MEMORY);
    }
  }

  if (req.method === 'DELETE') {
    // Reset memory — delete the file from GitHub
    try {
      const r = await fetch(
        `https://api.github.com/repos/${repo}/contents/${MEMORY_PATH}?ref=${branch}`,
        { headers }
      );
      if (r.ok) {
        const data = await r.json();
        await fetch(
          `https://api.github.com/repos/${repo}/contents/${MEMORY_PATH}`,
          {
            method: 'DELETE', headers,
            body: JSON.stringify({
              message: 'BuildMySite: reset agent memory',
              sha: data.sha,
              branch
            })
          }
        );
      }
      return res.status(200).json({ reset: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or DELETE only' });
}
