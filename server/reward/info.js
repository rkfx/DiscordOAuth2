const config = require("../rconfig").config();

module.exports = function setup_info_bank(client) {
    return new Promise(async (resolve, reject) => {
        if (!config.giveaway.enable) {
            resolve();
            return;
        }

        const channel = client.channels.cache.get(config.giveaway.info);
        let fields = [];

        // clear channel
        await channel.messages.fetch().then((messages) => {
            messages.forEach((message) => {
                message.delete();
            });
        }).catch((err) => {});

        config.giveaway.invites.forEach((invite_goal) => {
            fields.push({
                name: `${invite_goal.milestone} invites`,
                value: `${invite_goal.nodes} nodes`,
                inline: true
            });
        })

        channel.send({
            embeds: [{
                title: "Win a giveaway prize!",
                description: "The more of people you invite to this discord server, the higher chance you have to win a prize! The number of nodes is the number of giveaway elements you will have to increase your winning chances.",
                fields
            }]
        })

        resolve();
    });
}