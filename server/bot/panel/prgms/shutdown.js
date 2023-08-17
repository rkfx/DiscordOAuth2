module.exports = function config(api) {
    return new Promise(async (resolve, reject) => {
        await api.message.reply({
            embeds: [{
                title: "Bot Power Managment",
                description: "Service will shut down, NOW"
            }]
        });

        resolve();
        setTimeout(() => {
            console.log(`[api.power]       Shutdown command requested by ${api.message.author.tag} (${api.message.author.id})`);
            process.exit(0);
        }, 1000);
    });
}