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

async function handleSignUp(access, refresh, accessExpiresAt, refreshExpiresAt, provider) {
    try {
        const userId = await checkId(provider, access);

        const encryptedRefresh = refresh ? encrypt(refresh) : null;

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

        const userTokenId = data && data.length > 0 ? data[0].id : null;

        //user_token의 uuid 반환
        return { status: 200, user_token_id: userTokenId };
    } catch (error) {
        console.log(error);
        return { status: 500, error: 'auth validation failed' };
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

async function profileSetup(user_token_id, name, birthdate, categories, regions) {
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
            .eq('id', user_token_id);

        if (updErr) throw updErr;

        return { status: 200, success: true, profile: profile[0] };
    } catch (error) {
        console.log(error);
        return { status: 500, error: 'profile save failed' };
    }
}

async function checkInput(provider, provider_user_id) {
    const { data, error } = await supabase
        .from('user_tokens')
        .select('id, input_complete')
        .eq('provider', provider)
        .eq('user_id', provider_user_id)
        .limit(1)
        .single();

    if (error) return { status: 500, error: 'db error' };
    return ({ input_complete: data?.input_complete ?? false, user_token_id: data?.id });
}

async function refresh(user_token_id) {
    const { data, error } = await supabase
        .from('user_tokens')
        .select('refresh_token')
        .eq('id', user_token_id)
        .single();

    if (error || !data) return { error: 'no token' };

    const encRefresh = data.refresh_token;
    const refreshToken = await decrypt(encRefresh);

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', process.env.KAKAO_NATIVE_APP_KEY);
        params.append('refresh_token', refreshToken);

        const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', params);
        const newAccessToken = tokenRes.data.access_token;
        const expiresIn = tokenRes.data.expires_in;

        await supabase.from('user_tokens').update({
            access_token: newAccessToken,
            access_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        }).eq('id', user_token_id);

        return { access_token: newAccessToken, expires_in: expiresIn };
    } catch (err) {
        console.log(err);
        return { status: 500, error: 'token refresh failed' };
    }
}

module.exports = {
    handleSignUp,
    profileSetup,
    checkInput,
    refresh
};