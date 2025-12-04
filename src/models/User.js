const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    supabaseUserId: {  // Supabase의 user.id (UUID)를 저장
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    nickname: {
        type: String,
        // 프로필 저장 전까지는 null일 수 있음
    },
}, {
    timestamps: true // createdAt, updatedAt 자동 추가
});

const User = mongoose.model('User', userSchema);

module.exports = User;