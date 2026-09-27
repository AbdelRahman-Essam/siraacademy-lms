// In-memory progress tracker for the admin video upload status bar.
// Fine for a single-server deployment (matches the spec's one home server);
// would need a shared store (Redis) behind a load balancer.
const progress = new Map();

function set(uploadId, data) {
  progress.set(uploadId, { ...progress.get(uploadId), ...data });
}
function get(uploadId) {
  return progress.get(uploadId) || { status: "unknown" };
}
function clear(uploadId) {
  progress.delete(uploadId);
}

module.exports = { set, get, clear };
