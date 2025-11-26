const express = require('express');
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

router.post('/api/auth/exchange', async (req, res) => {
    const { provider, accessToken } = req.body;

    if (!provider || !accessToken) return res.status(400).json({ error: 'missing parameters' });

    try {
        // authService.exchangeSocialToken 함수 시그니처에 맞게 파라미터 수정
        const result = await authService.exchangeSocialToken(provider, accessToken);
        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }
        return res.status(200).json(result);
    } catch (err) {
        console.error('Exchange error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'missing refresh token' });

    try {
        const result = await authService.refreshServerToken(refreshToken);
        // result가 null일 경우(토큰 무효)를 먼저 체크
        if (!result) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
        return res.status(200).json(result);
    } catch (err) {
        console.error('Refresh error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});



module.exports = router;
