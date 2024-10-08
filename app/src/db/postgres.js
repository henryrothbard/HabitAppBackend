import postgres from 'postgres';

const sql = postgres({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    username: process.env.PG_USER,
    password: process.env.PG_PASS,
});

export default sql;