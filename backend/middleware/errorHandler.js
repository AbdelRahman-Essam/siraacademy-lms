// Centralized error handler — without this, any thrown/rejected error in an
// async controller falls through to Express's default HTML error page
// (and can leak stack traces). Express 5 forwards async rejections here
// automatically, so no per-route try/catch wrapper is needed.
function notFound(req, res) {
  res.status(404).json({ detail: "Not found." });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    detail: status === 500 ? "Something went wrong. Please try again." : err.message,
  });
}

module.exports = { notFound, errorHandler };
