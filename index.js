require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const http = require('http'); 

// 1. INITIALIZE DISCORD BOT CLIENT
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 2. RENDER PORT BINDING (Fixes the "No open ports detected" warning)
const port = process.env.PORT || 10000; // Render expects port 10000 by default
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('GamingForge Security Bot is live and actively protecting chat!\n');
}).listen(port, '0.0.0.0', () => {
    console.log(`📡 Render Port binding successful on port ${port}`);
});

// 3. IN-MEMORY STORAGE FOR ANTI-SPAM
const spamTracker = new Map();

// 4. TEXT NORMALIZATION ENGINE (Smashes bypass shortcuts and leetspeak)
function ultimateNormalize(text) {
    let cleaned = text.toLowerCase();
    
    // Swap common character bypass tricks
    cleaned = cleaned.replace(/[0o4a1i3e5s7t\$@!]/g, char => {
        const map = { '0':'o', '4':'a', 'a':'a', '1':'i', 'i':'i', '!':'i', '3':'e', 'e':'e', '5':'s', 's':'s', '7':'t', 't':'t', '$':'s', '@':'a' };
        return map[char] || char;
    });
    
    // Erase spaces and punctuation to counter spacing tricks
    cleaned = cleaned.replace(/[^a-z]/g, '');
    
    // Compress duplicate letters (e.g., "mooootherrr" becomes "mother")
    cleaned = cleaned.replace(/(.)\1+/g, '$1');
    
    // Convert phonetic Hinglish typos down to a single matched base
    cleaned = cleaned.replace(/ther/g, 'dr').replace(/dher/g, 'dr').replace(/der/g, 'dr').replace(/ph/g, 'f');
    
    return cleaned;
}

// 5. EVENT: BOT ONLINE SUCCESS
client.once('ready', () => {
    console.log(`🚀 Security online! Protecting against Hindi, English, and URL/Invite sharing.`);
});

// 6. EVENT: MESSAGE RECEIVED & CHECKED
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const now = Date.now();

    // Check if user is a server Administrator or Moderator
    const isStaff = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                    message.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

    // 🌐 RULE 1: LINK & DISCORD INVITE BLOCKER (Staff are immune)
    if (!isStaff) {
        const globalLinkRegex = /(https?:\/\/[^\s]+)/gi;
        const discordInviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)/gi;

        if (globalLinkRegex.test(message.content) || discordInviteRegex.test(message.content)) {
            try {
                await message.delete();
                const warning = await message.channel.send(`❌ ${message.author}, sharing links or server invites is strictly prohibited here!`);
                setTimeout(() => warning.delete().catch(() => {}), 4000);
                return; // Stop execution
            } catch (err) { console.error("Missing permissions to delete message."); }
        }
    }

    // 🏎️ RULE 2: ANTI-SPAM ATTACK PROTECTION
    if (!spamTracker.has(userId)) spamTracker.set(userId, []);
    const userTimestamps = spamTracker.get(userId);
    const recentMessages = userTimestamps.filter(time => now - time < 4000);
    
    if (recentMessages.length >= 3) {
        try { await message.delete(); return; } catch (err) {}
    }
    recentMessages.push(now);
    spamTracker.set(userId, recentMessages);

    // 🤬 RULE 3: EXPLICIT HINDI & ENGLISH BAD WORD PATTERNS
    const badWordsPattern = new RegExp([
        // Hindi Slangs & Phonetic Variations
        'madarchod', 'madrchod', 'mc', 'bhenchod', 'behenchod', 'bc', 'gand', 'gandu', 'gaand', 
        'chutiya', 'chutya', 'bhosda', 'bhosdike', 'luda', 'lund', 'lauda', 'sala', 'saala', 
        'kamina', 'harami', 'randi', 'kutta', 'bsdk', 'bhadwa', 'machod', 'lode', 'chod', 'chut',
        // English Hard Swears
        'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bitch', 'asshole', 'bastard', 
        'dick', 'pussy', 'cunt', 'whore', 'slut', 'nigger', 'nigga'
    ].join('|'), 'i');

    const fullyCleanedText = ultimateNormalize(message.content);

    if (badWordsPattern.test(fullyCleanedText)) {
        try {
            await message.delete();
            const warning = await message.channel.send(`⚠️ ${message.author}, that language is completely banned here!`);
            setTimeout(() => warning.delete().catch(() => {}), 4000);
            return;
        } catch (err) { console.error("Moderation action failed:", err.message); }
    }
});

// 7. EVENT: CATCH ABUSIVE CHAT EDITS
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
