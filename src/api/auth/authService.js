const axios = require('axios');
const supabase = require('../../config/supaClient');
const crypto = require('crypto');
const { param } = require('./authController');

const ENC_KEY = process.env.TOKEN_ENC_KEY;

async function encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENC_KEY, 'base64'), iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag().toString('base64');
    return `${iv.toString('base64')}:${tag}:${encrypted}`;
}

async function decrypt(encryptedStr) {
    if (!encryptedStr || typeof encryptedStr !== 'string') throw new Error('Invalid encrypted string');

    const parts = encryptedStr.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted string format');

    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    const key = Buffer.from(ENC_KEY, 'base64');
    if (key.length !== 32) throw new Error('Invalid encryption key length');

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed');
    }
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
            const naverRes = await axios.get('https://openapi.naver.com/v1/nid/me', {
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

async function findTokenRowByAccess(provider, accessToken) {
    const { data, error } = await supabase
        .from('user_tokens')
        .select('user_id, provider, access_token, refresh_token')
        .eq('provider', provider)
        .eq('access_token', accessToken)
        .single();

    if (error || !data) return null;
    return data;
}

async function handleSignUp(access, refresh, accessExpiresAt, refreshExpiresAt, provider) {
    try {
        const userId = await checkId(provider, access);

        const encryptedRefresh = refresh ? await encrypt(refresh) : null;

        const { data, error } = await supabase
            .from('user_tokens')
            .upsert([{
                provider: provider,
                user_id: userId,
                access_token: access,
                refresh_token: encryptedRefresh,
                access_expires_at: new Date(accessExpiresAt),
                refresh_expires_at: refreshExpiresAt ? new Date(refreshExpiresAt) : null
            }], { onConflict: ['provider', 'user_id'] });

        if (error) {
            console.error('Error upserting user token:', error);
            return { status: 500, error: 'Database upsert failed' };
        }

        return { status: 200 };
    } catch (error) {
        console.log(error);
        return { status: 500, error: 'auth validation failed' };
    }
}

async function profileSetup(userId, provider, name, birthdate, categories, regions) {
    try {
        const { data: profile, error: insertErr } = await supabase
            .from('user_profiles')
            .insert([{
                user_token_id,
                name,
                birthdate,
                preferred_categories: categories || [],
                preferred_regions: regions || []
            }]);
        if (insertErr) throw insertErr;

        const { error: updErr } = await supabase
            .from('user_tokens')
            .update({ input_complete: true, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('provider', provider);

        if (updErr) throw updErr;

        return { status: 200, success: true, profile: profile[0] };
    } catch (error) {
        console.log(error);
        return { status: 500, error: 'profile save failed' };
    }
}

async function checkInput(userId, provider) {
    const { data, error } = await supabase
        .from('user_tokens')
        .select('id, input_complete')
        .eq('provider', provider)
        .eq('user_id', userId)
        .limit(1)
        .single();

    if (error) return { status: 500, error: 'db error' };
    return ({ input_complete: data?.input_complete ?? false, user_token_id: data?.id });
}

async function refresh(provider, tokenRow) {
    try {
        const refreshToken = await decrypt(tokenRow.refresh_token);
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);

        let response;
        switch (provider) {
            case 'kakao':
                params.append('client_id', process.env.KAKAO_NATIVE_APP_KEY);
                response = await axios.post('https://kauth.kakao.com/oauth/token', params.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                break;
            case 'naver':
                params.append('client_id', process.env.NAVER_CLIENT_ID);
                params.append('client_secret', process.env.NAVER_CLIENT_SECRET);
                response = await axios.post('https://nid.naver.com/oauth2.0/token', params.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                break;
            default:
                return { status: 400, error: 'unsupported provider' };
        }

        const data = response.data;
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token || refreshToken;
        const expiresIn = data.expires_in; //seconds로 반환

        const expiresAtIso = expiresIn
            ? new Date(Date.now() + expiresIn * 1000).toISOString()
            : null;

        const { error: updateErr } = await supabase.from('user_tokens').update({
            access_token: newAccessToken,
            refresh_token: await encrypt(newRefreshToken),
            access_expires_at: expiresAtIso,
        }).eq('user_id', tokenRow.user_id).eq('provider', provider);

        if (updateErr) {
            return { status: 500, error: 'db update failed' };
        }

        return { status: 200, token: newAccessToken, expiresAt: expiresAtIso };
    } catch (err) {
        //외부 API에서 401 발생 시 진입
        console.log('refresh error:', err.response?.data || err.message);
        const status = err?.response?.status || 500;
        return { status, error: 'token refresh failed' };
    }
}

module.exports = {
    handleSignUp,
    profileSetup,
    findTokenRowByAccess,
    checkId,
    checkInput,
    refresh
};