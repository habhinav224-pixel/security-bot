require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const http = require('http'); 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ⚙️ LOCKDOWN CONFIGURATION
const PROTECTED_CHANNEL_ID = '1514503431623016458'; // Your specific restricted channel
const TIMEOUT_DURATION_MS = 5 * 60 * 1000; // 5 Minutes Timeout

// RENDER PORT BINDING (Ensures 24/7 web service uptime)
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('GamingForge Security Bot is live!\n');
}).listen(port, '0.0.0.0', () => {
    console.log(`📡 Render Port binding successful on port ${port}`);
});

const spamTracker = new Map();

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
    console.log(`🚀 Security online! Channel protection and slang shield fully active.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const now = Date.now();

    const isStaff = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                    message.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

    // 🚨 1. ZERO-TOLERANCE CHANNEL LOCKDOWN (Staff are immune)
    if (message.channel.id === PROTECTED_CHANNEL_ID && !isStaff) {
        try {
            await message.delete();
            if (message.member && message.member.moderatable) {
                await message.member.timeout(TIMEOUT_DURATION_MS, 'Sent a message in a restricted text channel.');
                const alert = await message.channel.send(`🚨 ${message.author} has been timed out for 5 minutes for chatting in a restricted channel!`);
                setTimeout(() => alert.delete().catch(() => {}), 5000);
            }
            return; 
        } catch (err) {
            console.error("Failed to execute channel lockdown timeout:", err.message);
        }
    }

    // 🌐 2. LINK & DISCORD INVITE BLOCKER
    if (!isStaff) {
        const globalLinkRegex = /(https?:\/\/[^\s]+)/gi;
        const discordInviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)/gi;

        if (globalLinkRegex.test(message.content) || discordInviteRegex.test(message.content)) {
            try {
                await message.delete();
                const warning = await message.channel.send(`❌ ${message.author}, sharing links or server invites is strictly prohibited here!`);
                setTimeout(() => warning.delete().catch(() => {}), 4000);
                return;
            } catch (err) { console.error("Missing permissions."); }
        }
    }

    // 🏎️ 3. ANTI-SPAM ATTACK PROTECTION
    if (!spamTracker.has(userId)) spamTracker.set(userId, []);
    const userTimestamps = spamTracker.get(userId);
    const recentMessages = userTimestamps.filter(time => now - time < 4000);
    
    if (recentMessages.length >= 3) {
        try { await message.delete(); return; } catch (err) {}
    }
    recentMessages.push(now);
    spamTracker.set(userId, recentMessages);

    // 🤬 4. MULTI-LANGUAGE ABUSE FILTER
    const badWordsPattern = new RegExp([
        'madarchod', 'madrchod', 'mc', 'bhenchod', 'behenchod', 'bc', 'gand', 'gandu', 'gaand', 
        'chutiya', 'chutya', 'bhosda', 'bhosdike', 'luda', 'lund', 'lauda', 'sala', 'saala', 
        'kamina', 'harami', 'randi', 'kutta', 'bsdk', 'bhadwa', 'machod', 'lode', 'chod', 'chut',
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
        } catch (err) { console.error(err.message); }
    }
});

client.login(process.env.DISCORD_TOKEN);
