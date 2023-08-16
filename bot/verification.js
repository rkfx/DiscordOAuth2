const config = require("../config.json");

module.exports = function setup_verify(client) {
    return new Promise(async (resolve, reject) => {
        const channel = await locate_verify(client);

        console.log(`[discord.channel] Found channel ${channel.id} for verification.`);

        channel.messages.fetch().then((messages) => {
            messages.forEach((message) => {
                message.delete();
            });

            channel.send({
                embeds: [{
                    title: "Account Authorization",
                    description: "Please click the link above or the button bellow to authorize your account. This is done to prevent spam and abuse of the giveaway system!",
                    url: config.auth,
                    footer: { text: "Thank You!" }
                }],
                components: [{
                    type: 1,
                    components: [{
                        type: 2,
                        style: 5,
                        label: "Authorize",
                        url: config.auth
                    }]
                }]
            });
        });

        resolve();
    });
}

function locate_verify(client) {
    return new Promise(async (resolve, reject) => {
        const guild = client.guilds.cache.get(config.guild);
        if (!guild) {
            reject("NO_VERIFY_GUILD");
            return;
        }

        const channel = guild.channels.cache.find(channel => channel.name.toLowerCase().includes("verify"));
        if (channel) {
            resolve(channel);
            return;
        }

        reject("NO_VERIFY_CHANNEL");
    });
}