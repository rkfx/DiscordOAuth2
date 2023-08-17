const subc = require("../subc");
const User = require("../../../oauth2/user");

module.exports = function config(api) {
    return subc(api.args, {
        "list": () => {
            let fields = [];
            api.config.user_dump.guilds.forEach((guild, index) => {
                const guild_info = api.client.guilds.cache.get(guild);

                // valid is when the bot is in the server
                fields.push({
                    name: `${guild_info.name} [${index}]`,
                    value: `Valid Dump Target: ${guild_info ? "Yes" : "No"}`,
                    inline: true
                });
            });

            api.message.reply({
                embeds: [{
                    title: "Bot User Dump Guilds",
                    description: "Server name is assigned an index for selection of target\n```json\n" + JSON.stringify(api.config.user_dump, null, 4) + "```",
                    fields
                }]
            });
        },
        "dump": () => {
            return new Promise((resolve, reject) => {
                if (api.args.length < 2) return api.message.reply("Invalid arguments. Missing guild index.");
                let target_index = 0;
                try {
                    target_index = parseInt(api.args[1]);
                } catch (err) {
                    reject(`Failed to parse guild index. Please enter a number.`);
                }
                const target = api.config.user_dump.guilds[target_index];
                if (!target) return api.message.reply("Invalid guild index. Guild does not exist.");

                api.connection.query("SELECT * FROM `auth_users`", (err, results) => {
                    const total = results.length;
                    let successful = 0;
                    let failed = 0;
                    let pre_existing = 0;

                    if (err) {
                        reject(`Failed to query database. Check configuration.`);
                        return api.message.reply({
                            embeds: [{
                                title: "Failed to dump users",
                                description: `Failed to query database. Check configuration.\n\`\`\`js\n${err}\`\`\``
                            }]
                        });
                    }

                    results.forEach(async (result, index) => {
                        const user = new User(api.connection, false, result.did);
                        try {
                            await user.load();
                        } catch (err) {
                            failed++;
                            return;
                        }

                        if (user.in_guild(target, api.client)) return pre_existing++;

                        try {
                            console.log("A");
                            await user.join_guild(target);
                            console.log("B");
                        } catch (err) {
                            failed++;
                            return;
                        }

                        successful++;

                        if (index === total - 1) {
                            api.message.reply({
                                embeds: [{
                                    title: `Dumped ${successful} users into ${target}`,
                                    fields: [
                                        {
                                            name: "Total",
                                            value: total,
                                            inline: true
                                        },
                                        {
                                            name: "Successful",
                                            value: successful,
                                            inline: true
                                        },
                                        {
                                            name: "Failed",
                                            value: failed,
                                            inline: true
                                        },
                                        {
                                            name: "Pre-existing",
                                            value: pre_existing,
                                            inline: true
                                        }
                                    ]
                                }]
                            });

                            resolve();
                        }
                    });
                });
            });
        }
    });
}