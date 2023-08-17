const config = require("../../rconfig").config();
const parse_command = require("./parser");

module.exports = function setup_panel(client, connection) {
    return new Promise((resolve, reject) => {
        client.on("messageCreate", async (message) => {
            if (message.channel.id != config.panel || message.author.bot) return;

            try {
                if (message.content !== "") {
                    await message.react("🔄");
                    const parsed = await parse_command(message.content, {connection, client, message, config});

                    await message.reactions.removeAll().catch((err) => {
                    });

                    if (parsed !== "IGNORE") await message.react("✅");
                }
            } catch (err) {
                message.reply({
                    embeds: [{
                        title: "Failed to execute command",
                        description: err
                    }]
                });

                await message.reactions.removeAll().catch((err) => {});
                await message.react("⚠️");
            }
        });

        resolve();
    });
}