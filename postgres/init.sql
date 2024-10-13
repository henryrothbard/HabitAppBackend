CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15) UNIQUE,
    name VARCHAR(50),
    password VARCHAR(60) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    private BOOLEAN DEFAULT TRUE NOT NULL,
    options JSONB
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    interval_days INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    private BOOLEAN DEFAULT TRUE NOT NULL,
    options JSONB
);

CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

CREATE TABLE IF NOT EXISTS memberships (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    group_id INT REFERENCES groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_occurrence TIMESTAMP,
    occurrences_this_interval INT DEFAULT 0,
    cache JSONB,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);

CREATE TABLE IF NOT EXISTS occurrences (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    group_id INT REFERENCES groups(id) ON DELETE CASCADE,
    occurred_at TIMESTAMP NOT NULL,
    reason TEXT,
    occurred BOOLEAN,
    options JSONB
);

CREATE INDEX IF NOT EXISTS idx_occurrences_user_id ON occurrences(user_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_user_id_group_id_occurred_at ON occurrences(user_id, group_id, occurred_at);
