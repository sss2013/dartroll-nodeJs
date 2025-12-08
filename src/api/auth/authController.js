const express = require('express');
const router = express.Router();
const authService = require('./authService');
const axios = require('axios');

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

//웹 버전 로그인 처리
router.get('/api/auth/kakao/callback', async (req,res)=> {
    const front_url = process.env.FRONT_END_URL;
    console.log(front_url);

    const { code } = req.query;
    if (!code) return res.redirect(`${front_url}/login-failed?error=missing_code`);

    console.log('Kakao callback code:', code);
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI; // 예: https://.../api/auth/kakao/callback

    try{
        const tokenResponse = await axios.post(
            'https://kauth.kakao.com/oauth/token',
            null,
            {
                headers: { 'Content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
                params: {
                    grant_type: 'authorization_code',
                    client_id: KAKAO_REST_API_KEY,
                    redirect_uri: KAKAO_REDIRECT_URI,
                    code: code,
                }
            }
        );
        console.log('Kakao token response data ok');
        const socialAccessToken = tokenResponse.data.access_token;

        const serverTokens = await authService.exchangeSocialToken('Kakao', socialAccessToken);
        if (serverTokens.error) {
            // authService에서 에러가 발생한 경우
            return res.redirect(`${front_url}/#/login-failed?error=${serverTokens.error}`);
        }
        const accessToken = serverTokens.access.token;
        const accessTokenExpiresIn = serverTokens.access.expiresAt;
        const refreshToken = serverTokens.refresh.token;
        
        const encodedExpiresAt = encodeURIComponent(accessTokenExpiresIn);

        res.redirect(`${front_url}/#/login-success?accessToken=${accessToken}&refreshToken=${refreshToken}&accessExpiresAt=${encodedExpiresAt}`);
    } catch(err){
        console.error('Kakao web callback error:', err.response ? err.response.data : err.message);
        return res.redirect(`${front_url}/login-failed?error=server_error`);
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
