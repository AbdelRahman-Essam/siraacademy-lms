// Builds the column/value lists for a partial INSERT/UPDATE from a request
// body, using an explicit allow-list ({ jsonKey: "column_name" }) so clients
// can never write columns they shouldn't (e.g. encryption keys via lesson PUT).
function collect(fields, body = {}) {
  const cols = [];
  const vals = [];
  for (const [key, col] of Object.entries(fields)) {
    if (body[key] === undefined) continue;
    cols.push(col);
    vals.push(body[key]);
  }
  return { cols, vals };
}

module.exports = { collect };
