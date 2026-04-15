import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "linkly",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function ensureSchema(entityNames) {
  for (const entityName of entityNames) {
    const table = `entity_${entityName.toLowerCase()}`;
    await query(
      `CREATE TABLE IF NOT EXISTS \`${table}\` (
        id VARCHAR(64) PRIMARY KEY,
        payload JSON NOT NULL,
        created_date DATETIME(3) NOT NULL,
        updated_date DATETIME(3) NOT NULL,
        INDEX idx_created_date (created_date),
        INDEX idx_updated_date (updated_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
  }
}
