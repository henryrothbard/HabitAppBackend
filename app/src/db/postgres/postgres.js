import postgres from 'postgres';

const pgsql = postgres({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    username: process.env.PG_USER,
    password: process.env.PG_PASS,
});

await pgsql`SELECT * FROM users LIMIT 1`;

export default pgsql;