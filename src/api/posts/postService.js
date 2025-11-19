const axios = require('axios');
const { ObjectId } = require('mongodb');
const { MongoClient, getCollection } = require('../../config/mongoClient');
const { updateLocale } = require('moment');
const dayjs = require('dayjs');

// 각 함수는 예외를 던지므로 호출에서 try-catch로 처리해야 합니다.
// DB의 post 테이블(컬렉션) 참조하는 함수
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
    return { insertedId: result.insertedId, ...doc };//id가 두번 오는거 같습니다.
}
//전체 검색 페이징 get요청{page, limit} 
async function getPost(payload) {
    const page = parseInt(payload["page"])|| 1;
    const limit = parseInt(payload["limit"]) || 10;
    const skip = (page - 1) * limit;
    const result = await _post().find().skip(skip).limit(limit).toArray(); //최신순으로 바꾸려고 했지만 오류
    return result;
}
//장르, 지역별 get요청 {page, limit,area, genre}
async function getFilteredPost(payload){
    const page = parseInt(payload["page"])|| 1;
    const limit = parseInt(payload["limit"]) || 10;
    const skip = (page - 1) * limit;
    const area = payload["area"];
    const genre = payload["genre"];
    let query = {};
    if(area && area != "전국"){
        query.area = area;
    }
    if(genre && genre != "전체"){
        query.genre = genre;
    }
    result = await _post().find(query).skip(skip).limit(limit).toArray();
    return result;
}
//글 삭제 id author (테스트 안해봤습니다)
async function deletePost(payload) {
    const post = await _post().findOne({ _id: new ObjectId(payload["id"]) });
    //if(post["author"] !== payload["author"]){return {error: can't delete}}
    const result = await _post().deleteOne({ _id: new ObjectId(payload["id"]) });
    return { result };
}
//router에서 호출할 함수들은 여기에 포함해야됨
module.exports = {
    createPost,
    getPost,
    getFilteredPost,
}