module.exports = function handler(_req, res) {
  res.status(200).json({ status: 'ok', service: 'studio-erp', timestamp: new Date().toISOString() });
};
