require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const spamTracker = new Map();

// Helper to scrub text formatting
function ultimateNormalize(text) {
    let cleaned = text.toLowerCase();
    cleaned = cleaned.replace(/[0o4a1i3e5s7t\$@!]/g, char => {
        const map = { '0':'o', '4':'a', 'a':'a', '1':'i', 'i':'i', '!':'i', '3':'e', 'e':'e', '5':'s', 's':'s', '7':'t', 't':'t', '$':'s', '@':'a' };
        return map[char] || char;
    });
    cleaned = cleaned.replace(/[^a-z]/g, '');
    cleaned = cleaned.replace(/(.)\1+/g, '$1');
    cleaned = cleaned.replace(/ther/g, 'dr').replace(/dher/g, 'dr').replace(/der/g, 'dr').replace(/ph/g, 'f');
    return cleaned;
}

client.once('ready', () => {
    console.log(`🚀 Security online! Protecting against Hindi, English, and URL/Invite sharing.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const now = Date.now();

    // Allow Administrators and Moderators to share links without getting blocked
    const isStaff = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                    message.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

    // 🌐 1. LINK & DISCORD INVITE BLOCKER (STAFF IMMUNE)
    if (!isStaff) {
        // Broad link pattern (http/https) and specialized aggressive Discord invite formats
        const globalLinkRegex = /(https?:\/\/[^\s]+)/gi;
        const discordInviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)/gi;

        if (globalLinkRegex.test(message.content) || discordInviteRegex.test(message.content)) {
            try {
                await message.delete();
                const warning = await message.channel.send(`❌ ${message.author}, sharing links or server invites is strictly prohibited here!`);
                setTimeout(() => warning.delete().catch(() => {}), 4000);
                return; // Stop execution so it doesn't process other rules
            } catch (err) {
                console.error("Missing permissions to delete link message.");
            }
        }
    }

    // 🏎️ 2. ANTI-SPAM ATTACK PROTECTION
    if (!spamTracker.has(userId)) spamTracker.set(userId, []);
    const userTimestamps = spamTracker.get(userId);
    const recentMessages = userTimestamps.filter(time => now - time < 4000);
    
    if (recentMessages.length >= 3) {
        try { await message.delete(); return; } catch (err) {}
    }
    recentMessages.push(now);
    spamTracker.set(userId, recentMessages);

    // 🤬 3. MULTI-LANGUAGE ABUSE FILTER
    const badWordsPattern = new RegExp([
        // Hindi Slangs
        'madarchod', 'madrchod', 'mc', 'bhenchod', 'behenchod', 'bc', 'gand', 'gandu', 'gaand', 
        'chutiya', 'chutya', 'bhosda', 'bhosdike', 'luda', 'lund', 'lauda', 'sala', 'saala', 
        'kamina', 'harami', 'randi', 'kutta', 'bsdk', 'bhadwa', 'machod', 'lode', 'chod', 'chut',
        // English Slangs
        'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bitch', 'asshole', 'bastard', 
        'dick', 'pussy', 'cunt', 'whore', 'slut', 'nigger', 'nigga', 'retard', 'cum'
    ].join('|'), 'i');

    const fullyCleanedText = ultimateNormalize(message.content);

    if (badWordsPattern.test(fullyCleanedText)) {
        try {
            await message.delete();
            const warning = await message.channel.send(`⚠️ ${message.author}, that language is completely banned here!`);
            setTimeout(() => warning.delete().catch(() => {}), 4000);
            return;
        } catch (err) {
            console.error("Moderation execution error:", err.message);
        }
    }
});

// Watch edited messages for sneaky links or slangs
client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.author.bot || !newMessage.guild) return;
    
    const isStaff = newMessage.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                    newMessage.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
                    
    if (!isStaff) {
        const linkCheck = /(https?:\/\/[^\s]+|discord\.gg|discord\.com\/invite)/gi;
        if (linkCheck.test(newMessage.content)) {
            try { return await newMessage.delete(); } catch (err) {}
        }
    }

    const fullyCleanedText = ultimateNormalize(newMessage.content);
    const badWordsPattern = /madarchod|madrchod|mc|bhenchod|bc|gand|chutiya|bhosdike|fuck|shit|bitch/i;
    if (badWordsPattern.test(fullyCleanedText)) {
        try { await newMessage.delete(); } catch (err) {}
    }
});

client.login(process.env.DISCORD_TOKEN);
