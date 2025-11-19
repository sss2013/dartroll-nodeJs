const { MongoClient } = require('mongodb');

const dbUser = process.env.MONGO_USER;
const dbPass = process.env.MONGO_PASS;
const MONGO_URI = `mongodb+srv://${dbUser}:${dbPass}@cluster0.sx8zk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

if (!MONGO_URI) {
    throw new Error('MONGO_URI 환경 변수가 설정되어 있지 않습니다.');
}

let client;
let db;

//Mongo 연결
async function connectMongo() {
    if (db) return db;

    client = new MongoClient(MONGO_URI);

    await client.connect();
    db = client.db('cultureyo_db');
    console.log('Connected to MongoDB');
    return db;
}

//컬렉션 참조 반환
function getCollection(name) {
    if (!db) {
        throw new Error('MongoDB에 연결되어 있지 않습니다. connectMongo()를 먼저 호출하세요.');
    }
    return db.collection(name);
}

/**
 * 연결 닫기 (테스트/종료용)
 */
async function closeMongo() {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

module.exports = {
    connectMongo,
    getCollection,
    closeMongo,
};

