require("dotenv").config();
const connectDB = require("../config/db");

connectDB()
  .then(() => { console.log("Schema applied."); return connectDB.pool.end(); })
  .catch((err) => { console.error(err); process.exit(1); });
