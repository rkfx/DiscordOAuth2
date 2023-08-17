module.exports = function config(api) {
    return new Promise(async (resolve, reject) => {
        const code = JSON.stringify(api.config, null, 4);
        await api.message.reply({
            embeds: [{
                title: "Config",
                description: "```json\n" + code + "```"
            }]
        });

        resolve();
    });
}