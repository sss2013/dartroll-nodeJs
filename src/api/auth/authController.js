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

//유저의 카카오 최초 로그인
router.post('/api/auth/kakaoSignIn', async (req, res) => {
    const { provider, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } = req.body;

    if (!accessToken) return res.status(400).json({ error: 'missing Access Token' });

    const result =
        await handleSignUp(accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, provider);

    res.json(result);
});

//프로필 변경
router.post('/api/auth/profile', async (req, res) => {
    const { user_token_id, name, birthdate, categories, regions } = req.body;
    if (!user_token_id || !name || !birthdate || !categories || !regions) {
        return res.status(400).json({ error: 'missing parameters' });
    }

    const result = await profileSetup(user_token_id, name, birthdate, categories, regions);
    res.json(result);
})

//유저의 정보 입력 상태 확인
router.get('/api/user/status', async (req, res) => {
    const { provider, provider_user_id } = req.query;
    if (!provider || !provider_user_id) {
        return res.status(400).json({ error: 'missing parameters' });
    }

    const result = await checkInput(provider, provider_user_id);
    res.json(result);
})

router.post('/api/auth/refresh', async (req, res) => {
    const { user_token_id } = req.body;
    if (!user_token_id) return res.status(400).json({ error: 'missing' });

    const result = await refresh(user_token_id);
    res.json(result);
});


module.exports = router;
