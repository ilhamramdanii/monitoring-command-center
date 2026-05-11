const path = require('path');
const db = require(path.join(__dirname, 'db.json'));

let forceError = null; // null | 404 | 500

module.exports = (req, res, next) => {
  // Toggle error simulation via query param
  if (req.query.simulate) {
    const code = req.query.simulate;
    forceError = code === 'reset' ? null : parseInt(code, 10);
    return res.json({ message: `Error simulation set to: ${forceError ?? 'none'}` });
  }

  // GET /api/services — list with random status mutation
  if (req.path === '/api/services' && req.method === 'GET') {
    if (forceError === 500) return res.status(500).json({ error: 'Internal Server Error (simulated)' });
    if (forceError === 404) return res.status(404).json({ error: 'Not Found (simulated)' });
    if (Math.random() < 0.1) return res.status(500).json({ error: 'Internal Server Error (random)' });

    const mutated = db.services.map(svc => ({
      ...svc,
      status: randomStatus(),
      lastHeartbeat: new Date().toISOString(),
    }));
    return res.json(mutated);
  }

  // GET /api/logs — global activity feed (all services, sorted desc)
  if (req.path === '/api/logs' && req.method === 'GET') {
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 40);
    const sorted = [...db.logs].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    // Simulate recency: stamp top entries with near-current timestamps
    const now = Date.now();
    const recent = sorted.slice(0, limit).map((log, i) => ({
      ...log,
      timestamp: new Date(now - i * 47000).toISOString(),
    }));
    return res.json(recent);
  }

  // GET /api/services/:id/logs
  if (req.path.startsWith('/api/services/') && req.method === 'GET' && req.path.endsWith('/logs')) {
    const serviceId = req.path.split('/')[3];
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const logs = db.logs
      .filter(l => l.serviceId === serviceId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    if (!logs.length) return res.status(404).json({ error: 'Service not found' });
    return res.json(logs);
  }

  next();
};

function randomStatus() {
  const roll = Math.random();
  if (roll < 0.70) return 'UP';
  if (roll < 0.90) return 'WARNING';
  return 'DOWN';
}
