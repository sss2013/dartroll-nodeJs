const User = require('../../models/User');

async function syncSupabaseUser(req, res) {
    const { record: supabaseUser } = req.body;
    if (!supabaseUser || !supabaseUser.id) {
        return res.status(400).json({ error: 'Invalid Supabase user data' });
    }

    try {
        const userData = {
            supabaseUserId: supabaseUser.id,
            nickname: supabaseUser.name,
        };

        const mongoUser = await User.findOneAndUpdate(
            { supabaseUserId: supabaseUser.id },
            { $set: userData },
            { upsert: true, new: true }
        );
        console.log(`[Sync] User ${mongoUser.supabaseUserId} synced successfully.`);
        return res.status(200).json({ message: 'User synced successfully' });
    } catch (err) {
        console.error('Error syncing Supabase user:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    syncSupabaseUser,
};