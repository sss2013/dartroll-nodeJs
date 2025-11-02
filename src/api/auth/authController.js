require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.post('/api/auth/kakao', async (req, res) => {
    const kakaoToken = req.body.token;

    try {
        const KakaoRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: `Bearer ${kakaoToken}` }
        });
        const KakaoId = KakaoRes.data.id;
        const email = KakaoRes.data.kakao_account?.email || null;
        console.log(kakaoToken, KakaoId, email);

        const { error } = await supabase
            .from('kakao_users')
            .upsert([{ kakao_id: KakaoId, email }], { onConflict: ['kakao_id'] })
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (error) {
        console.error('Kakao 인증 오류:', error);
        res.status(500).json({ error: 'Kakao 인증 실패' });
    }
});

module.exports = router;
