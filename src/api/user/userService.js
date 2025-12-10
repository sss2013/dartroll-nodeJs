const axios = require('axios');
const supabase = require('../../config/supaClient');
const { MongoClient, getCollection } = require('../../config/mongoClient');
const jwt = require('jsonwebtoken');
const { UUID } = require("bson");

// async function tempSave(userId,name){
//     try{
//         const usersCollection = getCollection('users');
//         const mongoUser = await usersCollection.findOne({_id:userId});

//         if(!mongoUser){
//             await usersCollection.insertOne({
//                 _id: new UUID(userId),
//                 name:name,
//             });
//         }
//         return {success:true};
//     } catch(error){
//         console.error('Temp save error:',error);
//         return {success:false, error};
//     }
// }

async function checkName(name){
    try{
        const { data,error} = await supabase
            .from('users')
            .select('id')
            .eq('name',name);

        if(error){
            console.error('Check name error:',error);
            return {success:false, error};
        }
        if(data.length >0){
            return {success:true, exists:true};
        } else {
            return {success:true, exists:false};
        } 
    } catch(err){
        console.error('Check name exception:',err);
        return {success:false, error:err};
    }
}

async function changeName(userId, newName){
    try {
        const { error } = await supabase
            .from('users')
            .update({ name: newName })
            .eq('id', userId);
        
        if (error) {
            console.error('Change name error:', error);
            return { success: false, error };
        }

        const usersCollection = getCollection('users');
        await usersCollection.updateOne(
            { _id: new UUID(userId) },
            { $set: { name: newName } }
        );
        return { success: true };
    } catch(err){
        console.error('Change name exception:', err);
        return { success: false, error: err };
    }
}

async function saveProfile(userId, name, birth, categories, regions) {
    try {
        const { error } = await supabase
            .from('users')
            .update({
                id: userId,
                name: name,
                birth: birth,
                categories: categories,
                regions: regions,
                inputComplete: true
            })
            .eq('id', userId);

        const usersCollection = getCollection('users');
        const mongoUser = await usersCollection.findOne({ _id: new UUID(userId) });

        if (!mongoUser) {
            await usersCollection.insertOne({
                _id: new UUID(userId),
                name: name,
            });
        }
        
        if (error) {
            console.error('Save profile error:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Save profile exception:', error);
        return { success: false, error };
    }
}

async function loadUserData(userId, fields) {
    let selectFields = '';
    try {
        switch (fields) {
            case 'name':
                selectFields = 'name';
                break;
            default:
                selectFields = '*';
                break;
        }
        
        const { data, error } = await supabase
            .from('users')
            .select(selectFields)
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Load user data error:', error);
            return { success: false, error };
        } else {
            return { success: true, data };
        }
    } catch (err) {
        console.error('Load user data exception:', err);
        return { success: false, error: err };
    }
}

async function deleteUser(userId) {
    try {
        const userData = await loadUserData(userId, 'provider');
        if (!userData.success) {
            console.error('Failed to load user data for deletion:', userData.error);
            return { success: false, error: 'Failed to load user data' };
        }

        const userNameToDelete = userData.data.name;

        const { data,error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        if (error) {
            console.error('Delete user error:', error);
            return { success: false, error };
        }

        const usersCollection = getCollection('users');
        await usersCollection.deleteOne({ _id: new UUID(userId) });

        const messageCollection = getCollection('messages');
        await messageCollection.deleteMany({ senderName: userNameToDelete });

        const reviewCollection = getCollection('review');
        await reviewCollection.deleteMany({ userId: new UUID(userId) });

        const matchingCollection = getCollection('matching');
        await matchingCollection.deleteMany({ userId: new UUID(userId) });
        
        const roomsCollection = getCollection('rooms');
        await roomsCollection.deleteMany(
            { participants : userNameToDelete },
            { $pull : { participants: userNameToDelete } }
        );
        
        return { success: true };
    } catch (err) {
        console.error('Delete user exception:', err);
        return { success: false, error: err };
    }
}


module.exports = {
    saveProfile,
    checkName,
    changeName,
    deleteUser,
    loadUserData
};