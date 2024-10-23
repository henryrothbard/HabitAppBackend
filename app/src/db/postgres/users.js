import pgsql from "./postgres.js";
import crypto from 'crypto';
import { validateDisplayName, validateEmail, validateUsername } from "./validateEntries.js";

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

const generateToken = () => {
    const token = crypto.randomBytes(64).toString('base64');
    return {token, hash: hashToken(token)};
}

const User = (where) => {
    const self = {
        exists: async () => (await pgsql`SELECT 1 FROM users ${where}`).length > 0,
        
        get: async (...columns) => (await pgsql`SELECT ${pgsql(columns)} from users ${where}`)[0],

        set: async (updates) => {
            const sqlUpdates = [];
            for (const [col, val] of Object.entries(updates))
                sqlUpdates.push(pgsql`${pgsql(col)} = ${val}`);
            await pgsql`UPDATE users SET ${pgsql(sqlUpdates)} ${where}`;
            return self;
        },

        appendToken: async () => {
            const {token, hash} = generateToken()
            await pgsql`
                UPDATE users 
                SET token_hashes = (array_append(
                    token_hashes[1:${process.env.MAX_USER_TOKENS - 1}], 
                    ${hash}
                )) ${where};`
            return token;
        },

        refreshToken: async (token, ...gets) => {
            const hash = hashToken(token);

            // get position of token hash, and any other data requested by `gets`
            const result = (await pgsql`
                SELECT ${pgsql(gets)}, array_position(token_hashes, ${hash}) AS pos
                FROM users ${where}
            `)[0];
            
            if (!result || !result.pos) return { verified: false, token: null, got: null};
            const {pos, ...got} = result;
            
            // remove old token hash and push new token hash
            const { token: newToken, hash: newHash } = generateToken();
            await pgsql`
                UPDATE users
                SET token_hashes = (array_cat(
                    token_hashes[array_length(token_hashes, 1)-${process.env.MAX_USER_TOKENS - 1}:${pos - 1}],
                    array_cat(token_hashes[${pos + 1}:array_length(token_hashes, 1)],
                    ARRAY[${newHash}])
                )) ${where};`

            return { verified: true, token: newToken, got};
        },
    };

    return self;
}

const Users = {
    findUnique: (uid, method) => {
        if (!(userSchema[method] && userSchema[method].unique)) return null;
        return User(pgsql`WHERE ${pgsql(method)} = ${uid}`);
    },

    create: async ({username, email, display_name, pass_hash}) => {
            if ( await Users.findUnique(username, 'username').exists() || 
                await Users.findUnique(email, 'email').exists()
            ) return null;

            const [{ id }] = await pgsql`
                INSERT INTO users (username, email, display_name, pass_hash)
                VALUES (${username}, ${email}, ${display_name}, ${pass_hash})
                RETURNING id;
            `;

            return User(id, 'id');
    }
};

export default Users;