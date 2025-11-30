const express = require('express');
const router = express.Router();
const userService = require('./userService');
const authenticateToken = require('../../middleware/authenticateToken');

router.post('/api/user/saveProfile', authenticateToken, async (req, res) => {
    const { name, birth, categories, regions } = req.body;
    const user = req.user;
    birth = parseInt(birth, 10);

    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });

    if (!name || !birth || !categories || !regions) return res.status(400).json({ error: 'missing required fields' });

    try {
        const result = await userService.saveProfile(user.id, name, birth, categories, regions);
        if (!result.success) {
            console.log('Save profile failed:', result.error);
            return res.status(500).json({ error: 'Failed to save profile' });
        }
        return res.status(200).json({ message: 'Profile saved successfully' });
    } catch (err) {
        console.error('Profile error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;