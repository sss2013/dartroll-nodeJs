const { MongoClient, getCollection } = require('../../config/mongoClient');
const {ObjectId} = require('mongodb');

async function findOrCreateRoom(userNames){
    const rooms = getCollection('rooms');

    const existingRoom = await rooms.findOne({ participants: { $all: userNames, $size: userNames.length } });

    if (existingRoom) {
        return existingRoom;
    }

    const newRoom = {
        participants: userNames,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage : null
    };

    const result = await rooms.insertOne(newRoom);
    return { ...newRoom, _id: result.insertedId };
}

//특정 유저가 속한 채팅방들 조회
async function getRoomsForUser(userName){
    const roomsCollection = getCollection('rooms');
    const rooms = await roomsCollection.find({ participants: userName }).sort({ updatedAt: -1 }).toArray();
    
    return rooms.map(room => {
        const otherParticipants = room.participants.filter(name => name !== userName);
        return {
            ...room,
            //타이틀이 없거나 ,생성된 타이틀을 덮어쓰고 싶을 때 앱에서 사용
            title : otherParticipants.join(', ') || '나와의 채팅'
        }
    })
}   


async function saveMessage(roomId,senderName,content){
    const messages = getCollection('messages');
    const rooms = getCollection('rooms');

    const newMessage = {
        roomId: new ObjectId(roomId),
        senderName: senderName,
        content: content,
        timestamp: new Date()
    };

    const result = await messages.insertOne(newMessage);

    await rooms.updateOne(
        { _id: new ObjectId(roomId) },
        { $set: { lastMessage: {text:content, timestamp: newMessage.timestamp} } }
    );

    return { ...newMessage, _id: result.insertedId };
}

// 채팅방 과거 메시지 불러오기
async function getMessagesForRoom(roomId, {page=0,limit=50}) {
    const messages = getCollection('messages');
    return messages
        .find({ roomId: new ObjectId(roomId) })
        .sort({ timestamp: -1 })
        .skip(page * limit)
        .limit(limit)
        .toArray();
}

module.exports={
    findOrCreateRoom,
    getRoomsForUser,
    saveMessage,
    getMessagesForRoom
}