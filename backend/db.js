const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "qr_db",
  password: "root",
  port: 5432,
});

module.exports = pool;
