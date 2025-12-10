const axios = require('axios');
const { ObjectId } = require('mongodb');
const { MongoClient, getCollection } = require('../../config/mongoClient');
const { updateLocale } = require('moment');
const dayjs = require('dayjs');
const { UUID } = require("bson");

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
function _users(){ 
    getCollection('users');
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
    const now = new Date();
    const kstOffset = 9 * 60; // 분 단위
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const doc = {
        ...payload,
        views: 0,
        report:[],
        like:[],
        createdAt: kstTime,
        updatedAt: kstTime,
    }
    const result = await selectCollection(tap).insertOne(doc);
    return { id: result.insertedId };
}
//전체 검색 페이징 get요청{page, limit} 
async function getPost(payload, tap) {
    const usersCollection = getCollection('users');
    const page = parseInt(payload["page"]) || 1;
    const limit = parseInt(payload["limit"]) || 10;
    const skip = (page - 1) * limit;
    const result = await selectCollection(tap).find().skip(skip).limit(limit).toArray();
    const safeResult = result.map(({...rest }) => ({...rest,likeCount: rest.like?.length ?? 0,
        reportedCount: rest.report?.length ?? 0}));
    const userIds = [...new Set(result.map(c => c.userId).filter(Boolean))];
    const uuidIds = userIds.map(userId => new UUID(userId))
    const users = await usersCollection.find({ _id: { $in: uuidIds } }).project({ _id: 1, name: 1 }).toArray();
    const nicknameMap = new Map(users.map(u => [u._id.toString(), u.name]));
    const postsWithNickname = safeResult.map(c => ({
    ...c,
    authorNickname: nicknameMap.get(c.userId) || null
    }));
    const final = postsWithNickname.map(({like, report, ...rest }) => rest);
    return final;
}
//하나만 가져오기
async function getOne(payload, tap) {
    const usersCollection = getCollection('users');
    const result = await selectCollection(tap).findOne({ _id: new ObjectId(payload.postId) });
    if (!result) throw new Error("Post not found");
    const { like, report,...safePost } = result;//userId 추가 시 userId가 안나타남
    const postAuthorId = result.userId; 
    const uuid = new UUID(postAuthorId);
    const users = await usersCollection
        .find({ _id: uuid })
        .project({ _id: 1, name: 1 })
        .toArray();
    const user = users[0];
    const authorNickname = user ? user.name : null;
    const postWithNickname = {
        ...safePost,
        authorNickname,
        likeCount:result.like?.length ?? 0,
        reportedCount:result.report?.length ?? 0////좋아요 누른 것을 반환하고 싶다면 토큰을 받고 result.like.includes(Id) 이런느낌으로 추가하면됨
    };
    return postWithNickname;
}
//장르, 지역별 get요청 {page, limit,area, genre}
async function getFilteredPost(payload, tap) {
    const usersCollection = getCollection('users');
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
    const safeResult = result.map(({...rest }) => ({...rest,likeCount: rest.like?.length ?? 0,
        reportedCount: rest.report?.length ?? 0}));
    const userIds = [...new Set(result.map(c => c.userId).filter(Boolean))];
    const uuidIds = userIds.map(userId => new UUID(userId))
    const users = await usersCollection.find({ _id: { $in: uuidIds } }).project({ _id: 1, name: 1 }).toArray();
    const nicknameMap = new Map(users.map(u => [u._id.toString(), u.name]));
    const postsWithNickname = safeResult.map(c => ({
    ...c,
    authorNickname: nicknameMap.get(c.userId) || null
    }));
    const final = postsWithNickname.map(({like, report,...rest }) => rest);//좋아요 누른 것을 반환하고 싶다면 토큰을 받고 result.like.includes(Id) 이런느낌으로 추가하면됨
    return final
}
//글 삭제 id userId, tap
async function deletePost(payload,tap) {
    const post = await selectCollection(tap).findOne({ _id: new ObjectId(payload.id) });
    if(post.userId !== payload.userId){
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
    const result = await selectCollection(tap).deleteOne({ _id: new ObjectId(payload.id) });
    //관련댓글 삭제
    // const comment = await _comment().deleteMany({ postId: new ObjectId(payload.id) });
    return { success: true };
}
//글 수정 id userId,tap
async function modifyPost(payload,tap) {
    const now = new Date();
    const kstOffset = 9 * 60; // 분 단위
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const post = await selectCollection(tap).findOne({ _id: new ObjectId(payload.id) });
    if(post.userId !== payload.userId){
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
    const result = await selectCollection(tap).updateOne({ _id: post._id },{ $set: { content: payload.content,updatedAt: kstTime} });
    return { success: true };
}
//조회수 증가
async function updateView(postId,tap) {//{글의 id}  views++
    const id = new ObjectId(postId)
    const result = await selectCollection(tap).updateOne({ _id:id },{ $inc: { views: 1 } });
    const post = await selectCollection(tap).findOne({ _id: id});
    return {success: true,views: post.views};
}
//게시글 좋아요
async function likePost(payload,tap) {
    let liked = false
    const id = new ObjectId(payload.postId)
    const post = await selectCollection(tap).findOne({ _id: id});
    if(post.like.includes(payload.userId)){
        await selectCollection(tap).updateOne({ _id:id },{ $pull: { like: payload.userId } });
        liked = false
    }
    else{
        await selectCollection(tap).updateOne({ _id:id },{ $push: { like: payload.userId } });
        liked = true
    }  
    const result = await selectCollection(tap).findOne({ _id: id});
    return {liked,likeCount:result.like?.length??0};
}
//게시글 신고
async function reportPost(payload,tap) {//{글의 id}
    let reported = false;
    const id = new ObjectId(payload.postId);
    const post = await selectCollection(tap).findOne({ _id: id});
    if(post.report.includes(payload.userId)){
        reported = false;
    }
    else{
        await selectCollection(tap).updateOne({ _id:id },{ $push: { report: payload.userId } });
        reported = true;
    }  
    const result = await selectCollection(tap).findOne({ _id: id});
    return {reported,reportedCount:result.report?.length??0};
}
//댓글 생성
async function createComment(payload) {//postId, userId, text, parentId,isDeleted
    const now = new Date();
    const kstOffset = 9 * 60; // 분 단위
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const doc = {
        ...payload,
        isDeleted: false,
        report:[],
        like:[],
        createdAt: kstTime,
        updatedAt: kstTime,
    }
    result = await _comment().insertOne(doc);
    return {success: true};
}
//댓글 삭제
async function deleteComment(payload) { //댓글 _id, userId,
    const comment = await _comment().findOne({ _id: new ObjectId(payload.id) });
    if (!comment) {
        const err = new Error("Not Found");
        err.status = 404;
        throw err;
    }
    if(comment.userId !== payload.userId){
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
    await _comment().updateOne({ _id: comment._id },{ $set: { isDeleted: true, content: "삭제된 댓글입니다." } });
    return { success: true };
}
//댓글 좋아요
async function likeComment(payload) {
    let liked = false;
    const id = new ObjectId(payload.commentId);
    const comment = await _comment().findOne({ _id: id});
    if (!comment) {
        const err = new Error("Not Found");
        err.status = 404;
        throw err;
    }
    if(comment.like.includes(payload.userId)){
        await _comment().updateOne({ _id:id },{ $pull: { like: payload.userId } });
        liked = false;
    }
    else{
        await _comment().updateOne({ _id:id },{ $push: { like: payload.userId } });
        liked = true;
    }  
    const result = await _comment().findOne({ _id: id});
    return {liked,likeCount:result.like?.length??0};
}
//댓글 조회
async function getComment(payload) {//postId postId는 ObjectId가 아님
    const usersCollection = getCollection('users');
    const query = {};
    query.postId = payload.postId;
    const result = await _comment().find(query).toArray();
    const safeResult = result.map(({...rest }) => ({...rest,likeCount: rest.like?.length ?? 0,
        reportedCount: rest.report?.length ?? 0}));
    const userIds = [...new Set(result.map(c => c.userId).filter(Boolean))];
    const uuidIds = userIds.map(userId => new UUID(userId))
    const users = await usersCollection.find({ _id: { $in: uuidIds } }).project({ _id: 1, name: 1 }).toArray();
    const nicknameMap = new Map(users.map(u => [u._id.toString(), u.name]));
    const commentsWithNickname = safeResult.map(c => ({
    ...c,
    authorNickname: nicknameMap.get(c.userId) || null
    }));
    const final = commentsWithNickname.map(({like, report,...rest }) => rest);
    return final;
}
//댓글 신고
async function reportComment(payload) {
    let reported = false;
    const id = new ObjectId(payload.commentId);
    const comment = await _comment().findOne({ _id: id});
    if (!comment) {
        const err = new Error("Not Found");
        err.status = 404;
        throw err;
    }
    if(comment.report.includes(payload.userId)){
        reported = false;
    }
    else{
        await _comment().updateOne({ _id:id },{ $push: { report: payload.userId } });
        reported = true;
    }  
    const result = await _comment().findOne({ _id: id});
    return {reported,reportedCount:result.report?.length??0};
}
//댓글 수정 댓글id, userId, text
async function modifyComment(payload) {
    const comment = await _comment().findOne({ _id: new ObjectId(payload.id) });
    if(comment.userId !== payload.userId){
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
    await _comment().updateOne({ _id: comment._id },{ $set: { text: payload.text,updatedAt: new Date()} });
    return { success: true };
}
//router에서 호출할 함수들은 여기에 포함해야됨
module.exports = {
    createPost,
    getPost,
    getFilteredPost,
    updateView,
    createComment,
    getComment,
    deleteComment,
    deletePost,
    modifyPost,
    modifyComment,
    reportComment,
    likeComment,
    reportPost,
    likePost,
    getOne
}