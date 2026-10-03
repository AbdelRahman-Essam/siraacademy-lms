// Centralized error handler — without this, any thrown/rejected error in an
// async controller falls through to Express's default HTML error page
// (and can leak stack traces). Express 5 forwards async rejections here
// automatically, so no per-route try/catch wrapper is needed.
// Translates common PostgreSQL errors into client errors instead of a blanket 500
// (e.g. malformed ids, missing required fields, duplicate keys).
function pgErrorResponse(err) {
  switch (err.code) {
    case "22P02": // invalid_text_representation
      return /uuid/i.test(err.message)
        ? { status: 404, detail: "Not found." } // malformed id in a URL/body
        : { status: 400, detail: "Invalid value." };
    case "23502": // not_null_violation
      return { status: 400, detail: "A required field is missing." };
    case "23503": // foreign_key_violation
      return { status: 400, detail: "Referenced record does not exist." };
    case "23505": // unique_violation
      return { status: 409, detail: "That record already exists." };
    case "23514": // check_violation
      return { status: 400, detail: "A value is out of the allowed range." };
    default:
      return null;
  }
}

function notFound(req, res) {
  res.status(404).json({ detail: "Not found." });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  const pg = pgErrorResponse(err);
  const status = pg?.status || err.status || 500;
  res.status(status).json({
    detail: pg?.detail || (status === 500 ? "Something went wrong. Please try again." : err.message),
  });
}

module.exports = { notFound, errorHandler };
