require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.get('/config', (req, res) => {
    res.json({
        KAKAO_NATIVE_APP_KEY: process.env.KAKAO_NATIVE_APP_KEY,
        NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
        NAVER_CLIENT_NAME: process.env.NAVER_CLIENT_NAME,
        NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET
    })
})

async function handleSignUp(token, provider, url, res) {
    try {
        const apiRes = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (provider == 'naver' && apiRes.data.resultcode !== '00') {
            return res.status(401).json({ error: '로그인 인증 실패' });
        }
        let userId;
        if (provider == 'kakao') {
            userId = apiRes.data.id;
        } else {
            userId = apiRes.data.response.id;
        }
        const { error } = await supabase
            .from('users')
            .upsert([{ user_id: userId, provider: provider }], { onConflict: ['user_id'] })
        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('로그인 인증 오류:', error);
        res.status(500).json({ error: '로그인 인증 실패' });
    }
}

router.post('/api/auth/signUp', async (req, res) => {
    const provider = req.body.provider;
    const token = req.body.token;

    if (provider === 'kakao') {
        return await handleSignUp(token, 'kakao', 'https://kapi.kakao.com/v2/user/me', res);
    } else {
        return await handleSignUp(token, 'naver', 'https://openapi.naver.com/v1/nid/me', res);
    }
});

module.exports = router;
