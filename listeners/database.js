import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

const dbRun = async (sql, ...params) => {
  try {
    await turso.execute({
      sql: sql,
      args: params
    });
  } catch (err) {
    console.log(err);
  }
};

const dbGet = async (sql, ...params) => {
  try {
    const result = await turso.execute({
      sql: sql,
      args: params
    });

    return result.rows[0];
  } catch (err) {
    console.log(err);
  };
};

const dbAll = async (sql, ...params) => {
  try {
    const result = await turso.execute({
      sql: sql,
      args: params
    });

    return result.rows;
  } catch (err) {
    console.log(err);
  };
};

export { turso, dbRun, dbGet, dbAll };