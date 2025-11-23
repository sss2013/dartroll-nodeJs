const express = require('express');
const axios = require('axios');
const supabase = require('../../config/supaClient');
const router = express.Router();
const authService = require('./authService');

//앱에서 필요한 환경변수 전달
router.get('/config', (req, res) => {
    res.json({
        KAKAO_NATIVE_APP_KEY: process.env.KAKAO_NATIVE_APP_KEY,
        NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
        NAVER_CLIENT_NAME: process.env.NAVER_CLIENT_NAME,
        NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET
    })
})

//유저의 카카오 로그인
router.post('/api/auth/SignIn', async (req, res) => {
    const { provider, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } = req.body;

    if (!accessToken) return res.status(400).json({ error: 'missing Access Token' });

    const result =
        await authService.handleSignUp(accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, provider);

    res.json(result);
});

//프로필 입력 & 변경
router.post('/api/auth/profile', async (req, res) => {
    const { access_token, provider, name, birthdate, categories, regions } = req.body;

    if (!name || !birthdate || !categories || !regions) {
        return res.status(400).json({ error: 'missing parameters' });
    }

    const userId = await authService.checkId(provider, access_token);
    if (!userId) {
        return res.status(400).json({ error: 'invalid access token' });
    }

    const result = await authService.profileSetup(userId, provider, name, birthdate, categories, regions);
    res.json(result);
})

//유저의 정보 입력 상태 확인
router.get('/api/user/status', async (req, res) => {
    const { access_token, provider } = req.query;
    if (!provider || !access_token) {
        return res.status(400).json({ error: 'missing parameters' });
    }

    const userId = await authService.checkId(provider, access_token);
    if (!userId) {
        return res.status(400).json({ error: 'invalid access token' });
    }

    const result = await authService.checkInput(userId, provider);
    res.json(result);
})

router.post('/api/auth/checkToken', async (req, res) => {
    const { provider, localTime, accessToken, expiresAt } = req.body;
    if (!provider || !localTime || !accessToken || !expiresAt) {
        return res.status(400).json({ error: 'missing parameters' });
    }
    try {
        const timeCheck = await authService.checkTime(localTime);
        if (timeCheck.status !== 200) {
            return res.status(timeCheck.status).json({ error: timeCheck.error });
        }

        const tokenCheck = await authService.checkToken(provider, accessToken, expiresAt);

        return res.status(tokenCheck.status).json(tokenCheck);
    } catch (err) {
        console.error('Error during token check:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
})

router.post('/api/auth/refresh', async (req, res) => {
    const { accessToken, provider } = req.body;
    if (!accessToken || !provider) return res.status(400).json({ error: 'missing parameters' });

    try {
        const tokenRow = await authService.findTokenRowByAccess(provider, accessToken);
        if (!tokenRow) {
            console.log('Token not found for refresh:', { provider, accessToken });
            return res.status(400).json({ error: 'token not found' });
        }

        const result = await authService.refresh(provider, tokenRow);
        if (result.error) {
            console.log('Refresh error:', result.error);
            const status = result.status || 500;
            return res.status(status).json({ error: result.error });
        }

        console.log(result);
        return res.status(result.status).json(result);
    } catch (error) {
        console.error('Error during token refresh:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});



module.exports = router;
