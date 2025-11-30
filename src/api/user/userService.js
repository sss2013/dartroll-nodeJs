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

module.exports = {
    saveProfile
};