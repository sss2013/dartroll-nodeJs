const axios = require('axios');
const supabase = require('../../config/supaClient');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ENC_KEY = process.env.TOKEN_ENC_KEY;

// async function encrypt(text) {
//     const iv = crypto.randomBytes(12);
//     const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENC_KEY, 'base64'), iv);
//     let encrypted = cipher.update(text, 'utf8', 'base64');
//     encrypted += cipher.final('base64');
//     const tag = cipher.getAuthTag().toString('base64');
//     return `${iv.toString('base64')}:${tag}:${encrypted}`;
// }

// async function decrypt(encryptedStr) {
//     const parts = encryptedStr.split(':');
//     const iv = Buffer.from(parts[0], 'base64');
//     const tag = Buffer.from(parts[1], 'base64');
//     const cipherText = parts[2];
//     const key = Buffer.from(ENC_KEY, 'base64');

//     const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
//     decipher.setAuthTag(tag);
//     let decrypted = decipher.update(cipherText, 'base64', 'utf8');
//     decrypted += decipher.final('utf8');
//     return decrypted;
// }

async function getProviderUserId(provider, accessToken) {
    try {
        let url;
        if (provider === 'Kakao')
            url = 'https://kapi.kakao.com/v2/user/me';
        else if (provider === 'Naver')
            url = 'https://openapi.naver.com/v1/nid/me';
        else throw new Error('Unsupported provider');

        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return provider === 'Kakao' ? String(response.data.id) : response.data.response.id;
    } catch (error) {
        console.error('Error fetching user ID from provider:', error.response?.data || error.message);
        return null;
    }
}

async function getUser(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { data: user, error } = await supabase
            .from('users')
            .select()
            .eq('id', decoded.id)
            .single();

        if (!user || error) {
            console.error('Get user error:', error);
            return null;
        }
        return user;
    } catch (error) {
        console.error('Error getting user:', error.message);
        return null;
    }
}

function generateServerTokens(user) {
    const payload = { id: user.id, provider: user.provider };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '30m'
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d'
    });

    const accessExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    return {
        access: { token: accessToken, expiresAt: accessExpiresAt },
        refresh: { token: refreshToken, expiresAt: refreshExpiresAt }
    };
}

async function exchangeSocialToken(provider, socialAccessToken) {
    const providerUserId = await getProviderUserId(provider, socialAccessToken);
    if (!providerUserId) {
        return { error: 'Invalid social token', status: 401 };
    }

    const { data: user, error } = await supabase
        .from('users')
        .upsert({ provider: provider, provider_user_id: providerUserId }, { onConflict: 'provider, provider_user_id' })
        .select()
        .single();

    if (error) {
        console.error('Upsert user error:', error);
        return { error: 'Database error', status: 500 };
    }
    const serverTokens = generateServerTokens(user);

    return serverTokens;
}

async function refreshServerToken(token) {
    try {
        const user = await getUser(token);

        if (!user) return null;

        return generateServerTokens(user);
    } catch (error) {
        console.error('Error refreshing server token:', error.message);
        return null;
    }
}


module.exports = {
    exchangeSocialToken,
    refreshServerToken
};