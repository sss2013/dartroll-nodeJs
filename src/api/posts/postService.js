const axios = require('axios');
const { ObjectId } = require('mongodb');
const { MongoClient, getCollection } = require('../../config/mongoClient');
const { updateLocale } = require('moment');
const dayjs = require('dayjs');

// 각 함수는 예외를 던지므로 호출에서 try-catch로 처리해야 합니다.
function _post() {
    return getCollection('post');
}

//새 포스트 작성 일단 { area, genre, title, content }
//이후에 author(작성자 닉네임 등), comment(댓글) 추가
//likes, views 등 추가할수도? 논의 필요
async function createPost(payload) {
    const doc = {
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    const result = await _post().insertOne(doc);
    return { insertedId: result.insertedId, ...doc };
}

//router에서 호출할 함수들은 여기에 포함해야됨
module.exports = {
    createPost,
}