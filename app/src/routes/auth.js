import express from "express";
import pgsql from "../db/postgres.js";
import bcrypt from 'bcrypt';
import asyncHandler from "../utils/asyncHandler.js";
import { validateDisplayName, validateEmail, validateUsername } from "../utils/validate.js";

const router = express.Router();

const createRefreshToken = (res, id) => {
    const token = crypto.randomBytes(64).toString('hex');
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    pgsql`UPDATE users SET token_hashes = (array_append(token_hashes[:4], ${token_hash})) WHERE id = ${id}`
    res.cookie('refreshToken', `${result.id}.${token}`, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    });
};

router.post('/login', asyncHandler( async (req, res) => {
    const loginMethod = req.body.email ? 'email' :
        req.body.username ? 'username' :
        req.body.phone ? 'phone' : null;
    
    if (!loginMethod) {
        res.status(400).send();
        return;
    }

    const user_identifier = req.body.email || req.body.username || req.body.phone;
    const pass = req.body.password;

    if (!pass) {
        res.status(400).send();
        return;
    }

    const rememberMe = req.body.rememberMe || false;
    
    const result = await pgsql`SELECT id, username, email, pass_hash FROM users WHERE ${loginMethod} = ${user_identifier}`[0];

    if (!result) {
        setTimeout(() => res.status(401).send(), Math.random() * 50 + 50);
        return;
    }

    const {id, username, email, pass_hash} = result;

    if (!await bcrypt.compare(pass, pass_hash)) {
        setTimeout(() => res.status(401).send(), Math.random() * 50 + 50);
        return;
    }

    if (rememberMe) {
        createRefreshToken(res, id);
    }

    req.session.user = { id, username, email }

    res.status(204).json({username, email});
}));

router.post('/refresh', asyncHandler( async (req, res) => {
    const [id, token] = req.cookies['refreshToken'].split('.');
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pgsql`WITH array_data AS (
            SELECT token_hashes, 
                array_position(token_hashes, ${token_hash}) AS pos
            FROM users
            WHERE id = ${id}
        )
        SELECT
            CASE
                WHEN pos IS NOT NULL THEN
                    array_cat(
                        token_hashes[1:pos-1],
                        token_hashes[pos+1:array_length(token_hashes, 1)]
                    )
                ELSE token_hashes
            END AS new_array,
        (pos IS NOT NULL) AS found,
        username,
        email
    FROM array_data;`[0]

    if (!result || !result.found) {
        setTimeout(() => res.status(401).send(), Math.random() * 50 + 50);
        return;
    }

    createRefreshToken(res, id);

    req.session.user = { id, username, email }

    res.status(204).json({username, email});
}));

const userExists = async (uid, method) => {
    return (await pgsql`SELECT 1 FROM users WHERE ${method} = ${uid}`).length > 0;
}

router.post('/user-exists', asyncHandler( async (req, res) => {
    const method = req.body.email ? 'email' :
        req.body.username ? 'username' :
        req.body.phone ? 'phone' : null;
    
    if (!method) {
        res.status(400).send();
        return;
    }

    const uid = req.body.email || req.body.username || req.body.phone;

    res.json({exists: await userExists(uid, method)});
}));

router.post('/signup', asyncHandler( async (req, res) => {
    const { username, email, displayName, password } = req.body;

    if ( !(
        validateEmail(email) && 
        validateUsername(username) && 
        validateDisplayName(displayName) && 
        password
    )) {
        res.status(400).send();
        return;
    }

    if (await userExists(username, 'username') || await userExists(email, 'email')) {
        res.status(401).send();
        return;
    }

    

}));

router.post('/logout', (req, res) => {

});

router.post('/logout-all', (req, res) => {
    
});

export default router;