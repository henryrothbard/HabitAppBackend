import pgsql from "./sql"

export const userSchema = {
    id: {unique: true},
    username: {unique: true},
    email: {unique: true},
    phone: {unique: true},
    display_name: {unique: false},
    pass_hash: {unique: false},
    token_hashes: {unique: false},
    created_at: {unique: false},
    private: {unique: false},
    options: {unique: false},

}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('base64');

const newToken = (id) => {
    const token = crypto.randomBytes(64).toString('base64');
    return {token, hash: hashToken(token)};
}

const User = (where) => {
    const self = {
        exists: async () => (await pgsql`SELECT EXISTS(SELECT 1 FROM users ${where});`)[0],
        
        get: async (...columns) => await pgsql`
                SELECT ${pgsql(columns)} from users ${where};
            `[0],

        set: async (column, value) => {
            await pgsql`UPDATE users SET ${column} ${value} ${where};`;
            return self;
        },

        appendToken: async () => {
            const {token, hash} = newToken()
            await pgsql`
                UPDATE users 
                SET token_hashes = (array_append(
                    token_hashes[1:${process.env.MAX_USER_TOKENS - 1}], 
                    ${hash}
                )) ${where};`
            return token;
        },

        refreshToken: async (token, gets) => {
            const hash = hashToken(token);
            const result = await pgsql`
                SELECT ${pgsql(gets)}, array_position(token_hashes, ${hash}) AS pos
                FROM users ${where}
            `[0];
            if (!result) return null;
            const {pos, ...got} = result;
            if (!pos) return { verified: false, token: null, got};
            const { token: newToken, hash: newHash } = newToken();
            await pgsql`
                UPDATE users
                SET token_hashes = (array_cat(
                    token_hashes[array_length(token_hashes, 1)-${process.env.MAX_USER_TOKENS - 1}:${pos - 1}],
                    token_hashes[${pos + 1}:array_length(token_hashes, 1)],
                    ARRAY[${newHash}]
                )) ${where};`
            return { verified: true, token: token, got};
        },
    };

    return self;
}

const Users = {
    findUnique: (uid, method) => {
        if (!(userSchema[method] && userSchema[method].unique))
            return null;

        return User(pgsql`WHERE ${method} = ${uid}`)
    },

    create: ({username, email, display_name, pass_hash}) => {
            const {id} = pgsql`
                INSERT INTO users (username, email, display_name, pass_hash)
                VALUES (${username}, ${email}, ${display_name}, ${pass_hash})
                RETURNING id;
            `[0];
            return Users(id, 'id');
    }
};

export default Users;