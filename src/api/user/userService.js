const axios = require('axios');
const supabase = require('../../config/supaClient');
const jwt = require('jsonwebtoken');

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

async function loadUserData(userId, option) {
    let selectFields = '';
    try {
        switch (option) {
            case 'name':
                selectFields = 'name';
                break;
            case 'preferences':
                selectFields = 'categories, regions';
                break;
            case 'all':
                selectFields = 'name, birth, categories, regions, inputComplete';
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
            return { success: true, data};
        }
    } catch (err) {
        console.error('Load user data exception:', err);
        return { success: false, error: err };
    }
}


module.exports = {
    saveProfile,
    loadUserData
};