const axios = require('axios');
const { ObjectId } = require('mongodb');
const { MongoClient, getCollection } = require('../../config/mongoClient');
const { updateLocale } = require('moment');
const dayjs = require('dayjs');

// 각 함수는 예외를 던지므로 호출에서 try-catch로 처리해야 합니다.
// DB의 review 테이블(컬렉션) 참조하는 함수
function _review() {
    return getCollection('review');
}
// DB의 matching 테이블(컬렉션) 참조하는 함수
function _matching() {
    return getCollection('matching');
}
function _comment() {
    return getCollection('comment');
}
function selectCollection(tap) {
    try {
        switch (tap) {
            case 'review':
                return _review();
            case 'matching':
                return _matching();
        }
    } catch (error) {
        console.error('Error selecting collection:', error);
        throw error;
    }
}

//새 포스트 작성 일단 {userId,area, genre, title, content,url,tap }
//이후에 author(작성자 닉네임 등), comment(댓글) 추가
//likes, views 등 추가할수도? 논의 필요
//views 및 userId 추가
async function createPost(payload, tap) {
    const doc = {
        ...payload,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    const result = await selectCollection(tap).insertOne(doc);
    return { id: result.insertedId };
}
//전체 검색 페이징 get요청{page, limit} 
async function getPost(payload, tap) {
    const page = parseInt(payload["page"]) || 1;
    const limit = parseInt(payload["limit"]) || 10;
    const skip = (page - 1) * limit;
    const result = await selectCollection(tap).find().skip(skip).limit(limit).toArray(); //최신순으로 바꾸려고 했지만 오류
    return result;
}

//장르, 지역별 get요청 {page, limit,area, genre}
async function getFilteredPost(payload, tap) {
    const page = parseInt(payload["page"]) || 1;
    const limit = parseInt(payload["limit"]) || 10;
    const skip = (page - 1) * limit;
    const area = payload["area"];
    const genre = payload["genre"];
    const query = {};
    if (area && area != "전국") {
        query.area = area;
    }
    if (genre && genre != "전체") {
        query.genre = genre;
    }
    const result = await selectCollection(tap).find(query).skip(skip).limit(limit).toArray();
    return result;
}

//글 삭제 id author (테스트 안해봤습니다)
async function deletePost(payload,tap) {
    const post = await selectCollection(tap).findOne({ _id: new ObjectId(payload["id"]) });
    //if(post["author"] !== payload["author"]){return {error: can't delete}}
    const result = await selectCollection(tap).deleteOne({ _id: new ObjectId(payload["id"]) });
    return { result };
}

async function updateView(postId,tap) {//{글의 id}  views++
    const result = await selectCollection(tap).findByIdAndUpdate(postId, { $inc: { views: 1 } });
    return result;
}
async function createComment(payload) {//postId, userId, text
    const doc = {
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
    }
    result = await _comment().insertOne(doc);
    return result;
}
async function getComment(payload) {//postId
    const postId = new ObjectId(payload.postId);
    const query = {};
    query.postId = postId;
    const result = await _comment().find(query).toArray();
    return result;
}
//router에서 호출할 함수들은 여기에 포함해야됨
module.exports = {
    createPost,
    getPost,
    getFilteredPost,
    updateView,
    createComment,
    getComment
}