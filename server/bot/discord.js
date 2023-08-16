const { Client, Events, GatewayIntentBits } = require("discord.js");
const config = require("../../config.json");

module.exports = function create_discord() {
    return new Promise((resolve, reject) => {
        let intents = [];
        for (const intent of Object.keys(GatewayIntentBits)) { intents.push(GatewayIntentBits[intent]); }
        const client = new Client({ intents });
        client.on("ready", () => { resolve(client); });
        client.login(config.token).catch((err) => {
            reject("ERROR_LOGIN");
        });
    });
}