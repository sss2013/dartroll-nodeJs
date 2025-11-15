const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 서버 전용 키(노출 금지)

if (!supabaseUrl || !supabaseKey) {
    throw new Error('환경변수 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;