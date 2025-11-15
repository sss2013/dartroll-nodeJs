const axios = require('axios');
const supabase = require('../../config/supaClient');
const crypto = require('crypto');

const ENC_KEY = process.env.TOKEN_ENC_KEY;

function encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENC_KEY, 'base64'), iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag().toString('base64');
    return `${iv.toString('base64')}:${tag}:${encrypted}`;
}

async function handleSignUp(access, refresh, accessExpires, refreshExpires, userId, provider, res) {
    let userId = await checkId(provider, access);

    return userId;
}

async function checkId(provider, accessToken) {
    try {
        let providerUserId;
        if (provider === 'kakao') {
            const kakaoRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
            );
            providerUserId = String(kakaoRes.data.id);
        } else {
            providerUserId = await axios.get('https://openapi.naver.com/v1/nid/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            providerUserId = String(naverRes.data.response.id);
        }
        return providerUserId;
    } catch (error) {
        console.error('Error fetching user ID from provider:', error);
        throw new Error('Failed to fetch user ID from provider');
    }
}

module.exports = {
    handleSignUp
};