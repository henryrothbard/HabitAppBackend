import express from "express";
import bcrypt from 'bcrypt';
import asyncHandler from "../utils/asyncHandler.js";
import Users from "../db/postgres/users.js";
import { validateUsername, validateDisplayName, validateEmail, validatePassword } from "../db/postgres/validateEntries.js";

const router = express.Router();

const createRefreshCookie = (res, id, token) => {
    res.cookie('refreshToken', `${id}.${token}`, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    });
};

router.post('/login', asyncHandler( async (req, res) => {
    const loginMethod = req.body.email ? 'email' :
        req.body.username ? 'username' 
        : null;

    const uid = req.body.email || req.body.username;
    const password = req.body.password;
    const rememberMe = req.body.remember_me || false;
    
    if (!loginMethod || !password) {
        res.status(400).send();
        return;
    }

    const user = Users.findUnique(uid, loginMethod);

    const result = await user.get('id', 'username', 'email', 'display_name', 'pass_hash');
    
    if (!result || !(await bcrypt.compare(password, result.pass_hash))) {
        res.status(401).send();
        return;
    }

    const { id, username, email, display_name } = result;

    if (rememberMe) 
        createRefreshCookie(res, id, await user.appendToken());

    req.session.user = { id };

    res.json({id, username, email, display_name});
}));

router.post('/refresh', asyncHandler( async (req, res) => {
    const cookie = req.cookies['refreshToken'];
    if (!cookie) {
        res.status(400).send();
        return;
    }

    const [id, token] = cookie.split('.');

    const result = await Users.findUnique(id, 'id').refreshToken(token, 'username', 'email', 'display_name');

    if (!result || !result.verified) {
        res.clearCookie('refreshToken');
        res.status(401).send();
        return;
    }

    const { username, email, display_name } = result.got;

    createRefreshCookie(res, id, result.token);

    req.session.user = { id }

    res.json({id, username, email, display_name});
}));

router.post('/user-exists', asyncHandler( async (req, res) => {
    const method = req.body.email ? 'email' :
        req.body.username ? 'username' :
        req.body.phone ? 'phone' : null;
    
    if (!method) {
        res.status(400).send();
        return;
    }

    const uid = req.body.email || req.body.username || req.body.phone;

    res.json({exists: await Users.findUnique(uid, method).exists()});
}));

router.post('/signup', asyncHandler( async (req, res) => {
    const { username, email, display_name, password } = req.body;

    if (!(validateUsername(username) && 
        validateEmail(email) && 
        validateDisplayName(display_name) && 
        validatePassword(password)) 
    ) {
        res.status(400).send();
        return;
    }

    const pass_hash = await bcrypt.hash(password, Number(process.env.PASSWORD_SALT_ROUNDS))

    if (await Users.create({username, email, display_name, pass_hash}) === null) {
        res.status(401).send();
        return;
    }

    res.send();
}));

router.post('/logout', (req, res) => {

});

router.post('/logout-all', (req, res) => {
    
});

export default router;