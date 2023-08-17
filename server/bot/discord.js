const { Client, Events, GatewayIntentBits } = require("discord.js");
const config = require("../../config.json");

module.exports = function create_discord() {
    return new Promise((resolve, reject) => {
        const intents = [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildBans,
            GatewayIntentBits.GuildEmojisAndStickers,
            GatewayIntentBits.GuildIntegrations,
            GatewayIntentBits.GuildWebhooks,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.DirectMessageTyping,
        ];
        console.log(`[discord.login]   Intents: ${intents.join(", ")}`);
        const client = new Client({ intents });
        client.on("ready", () => { resolve(client); });
        client.login(config.token).catch((err) => {
            console.log("[discord.login]   CRITCAL FAIL: " + err)
            reject("ERROR_LOGIN");
        });
    });
}