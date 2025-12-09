const express = require('express');
const router = express.Router();
const userService = require('./userService');
const authenticateToken = require('../../middleware/authenticateToken');

router.post('/api/user/saveProfile', authenticateToken, async (req, res) => {
    const { name, birth, categories, regions } = req.body;
    const user = req.user;
    const parsedBirth = parseInt(birth, 10);

    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });

    if (!name || !parsedBirth || !categories || !regions) return res.status(400).json({ error: 'missing required fields' });
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

router.get('/api/user/checkName', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'missing name parameter' });

    try {
        const result = await userService.checkName(name);
        if (!result.success) {
            console.log('Check name failed:', result.error);
            return res.status(500).json({ result : false });
        }
        return res.status(200).json({ exists: result.exists });
    } catch(err){
        console.error('Check name error:', err);
        return res.status(500).json({ result : false });
    }   
});

router.post('/api/user/changeName', authenticateToken, async (req, res) => {
    const { newName } = req.body;
    const user = req.user;

    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });

    if (!newName) return res.status(400).json({ error: 'missing newName parameter' });

    try {
        const result = await userService.changeName(user.id, newName);
        if (!result.success) {
            console.log('Change name failed:', result.error);
            return res.status(500).json({ result : false } );
        }
        return res.status(200).json({ result : result.success });
    } catch (err) {
        console.error('Change name error:', err);
        return res.status(500).json({ result : false });
    }
});

router.get('/api/user/loadUserId', authenticateToken, async (req, res) => {
    const user = req.user;

    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
    try {
        const userId = user.id;
        return res.status(200).json({ id: userId });
    } catch (err) {
        console.error('Load user ID error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/api/user/loadUserData', authenticateToken, async (req, res) => {
    const user = req.user;
    const fields = req.query.fields || '*';

    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });

    try {
        const result = await userService.loadUserData(user.id, fields);
        if (!result.success) {
            console.log('Load user data failed:', result.error);
            return res.status(500).json({ error: 'Failed to load user data' });
        }
        return res.status(200).json(result.data);
    } catch (err) {
        console.error('Load user data error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;