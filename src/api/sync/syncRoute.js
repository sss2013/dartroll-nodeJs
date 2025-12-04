const express = require('express');
const router = express.Router();
const { syncSupabaseUser } = require('./syncController');

const authenticateSupabaes = (req, res, next) => {
    const supabaseSecret = req.headers['x-supabase-secret'];
    if (supabaseSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

router.post('/user', authenticateSupabaes, syncSupabaseUser);

module.exports = router;