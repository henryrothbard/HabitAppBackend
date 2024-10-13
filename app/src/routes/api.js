import express from "express";

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password, remeberMe } = req.body;

});

router.post('/signup', (req, res) => {
    const { username, password, remeberMe } = req.body;

});

router.post('/logout', (req, res) => {

});

router.post('/logout-all', (req, res) => {
    
});

router.get('/heartbeat', (req, res) => {

});

export default router;