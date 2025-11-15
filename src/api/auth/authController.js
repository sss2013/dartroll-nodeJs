const express = require('express');
const axios = require('axios');
const router = express.Router();


//앱에서 필요한 환경변수 전달
router.get('/config', (req, res) => {
    res.json({
        KAKAO_NATIVE_APP_KEY: process.env.KAKAO_NATIVE_APP_KEY,
        NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
        NAVER_CLIENT_NAME: process.env.NAVER_CLIENT_NAME,
        NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET
    })
})

router.post('/api/auth/kakaoSignIn', async (req, res) => {
    const { provider, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } = req.body;

    if (!accessToken) return res.status(400).json({ error: 'missing Access Token' });

    // const result =
    //     await handleSignUp(accessToken, refreshToken, accessExpires, refreshExpires, userId, provider, res);

    res.status(200).json({ message: 'Kakao login successful' });
    console.log(provider);
    console.log(accessToken);
    console.log(refreshToken);
    console.log(accessExpiresAt);
    console.log(refreshExpiresAt);
});


module.exports = router;
