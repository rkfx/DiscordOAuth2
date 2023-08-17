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
        "stat": () => {
            return new Promise((resolve, reject) => {
                api.connection.query("SELECT COUNT(*) AS total_records FROM `auth_users`", (err, rows) => {
                    if (err) return reject(`Failed to get record information. ${err}`);

                    api.connection.query("SELECT * FROM `auth_users` ORDER BY `last_refresh_stamp` DESC LIMIT 1", async (err, rows2) => {
                        const user = new User(api.connection, false, rows2[0].did);
                        let last_auth_str = "";

                        try {
                            await user.load();
                            const profile = await user.get_profile();
                            last_auth_str = `${profile.username}#${profile.discriminator} on ${new Date(rows2[0].last_refresh_stamp * 1000).toUTCString()}`;
                        } catch (err) {
                            last_auth_str = "Unknown [Driver Error] - " + err;
                        }

                        api.message.reply({
                            embeds: [{
                                title: "OAuth2 User Statistics",
                                description: "Current information regarding the OAuth2 user database.",
                                fields: [
                                    {
                                        name: "Total Users",
                                        value: rows[0].total_records,
                                        inline: true
                                    },
                                    {
                                        name: "Last Authorized",
                                        value: last_auth_str,
                                        inline: true
                                    }
                                ]
                            }]
                        })
                            .then(() => {
                                resolve();
                            })
                            .catch((err) => {
                                reject(`Failed to send message. ${err}`);
                            });
                    });
                });
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
                    let deauthorized = 0;

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
                            console.log("A");
                            recheck();
                            return;
                        }

                        if (user.in_guild(target, api.client)) {
                            pre_existing++;
                            console.log("B");
                            recheck();
                            return;
                        }

                        try {
                            await user.join_guild(target);
                        } catch (err) {
                            failed++;

                            try {
                                if (!await user.aux_connected()) {
                                    console.log(`[discord.guild]   User ${result.did} failed dump. User is not connected to aux.`);
                                    await user.de_authorize();
                                    console.log(`[discord.guild]   User ${result.did} removed from database.`);
                                    deauthorized++;
                                } else {
                                    console.log(`[discord.guild]   User ${result.did} failed dump. User is connected to aux. Failed ${err}`);
                                }
                            } catch (err) {
                                console.log(`[discord.guild]   User ${result.did} failed to be removed from database. ${err}`);
                            }

                            console.log("C");
                            recheck();
                            return;
                        }

                        successful++;
                        console.log("D" + successful);
                        recheck();

                        function recheck() {
                            if (index === results.length - 1) {
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
                                            },
                                            {
                                                name: "De-authorized",
                                                value: deauthorized,
                                                inline: true
                                            }
                                        ]
                                    }]
                                });

                                resolve();
                            }
                        }
                    });
                });
            });
        },
        "retract": () => {
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
                    if (err) {
                        reject(`Failed to query database. Check configuration.`);
                        return api.message.reply({
                            embeds: [{
                                title: "Failed to retract users",
                                description: `Failed to query database. Check configuration.\n\`\`\`js\n${err}\`\`\``
                            }]
                        });
                    }

                    const total = results.length;
                    let successful = 0;
                    let failed = 0;
                    let not_in_guild = 0;
                    let deauthorized = 0;

                    results.forEach(async (result, index) => {
                        const user = new User(api.connection, false, result.did);
                        try {
                            await user.load();
                        } catch (err) {
                            failed++;
                            console.log("A");
                            recheck();
                            return;
                        }

                        if (!user.in_guild(target, api.client)) {
                            not_in_guild++;
                            console.log("B");
                            recheck();
                            return;
                        }

                        try {
                            await user.leave_guild(target, api.client);
                        } catch (err) {
                            failed++;

                            try {
                                if (!await user.aux_connected()) {
                                    console.log(`[discord.guild]   User ${result.did} failed retract. User is not connected to aux.`);
                                    await user.de_authorize();
                                    console.log(`[discord.guild]   User ${result.did} removed from database.`);
                                    deauthorized++;
                                } else {
                                    console.log(`[discord.guild]   User ${result.did} failed retract. User is connected to aux. Failed ${err}`);
                                }
                            } catch (err) {
                                console.log(`[discord.guild]   User ${result.did} failed to be removed from database. ${err}`);
                            }

                            console.log("C");
                            recheck();
                            return;
                        }

                        successful++;
                        console.log("D" + successful);
                        recheck();

                        function recheck() {
                            if (index === results.length - 1) {
                                api.message.reply({
                                    embeds: [{
                                        title: `Retracted ${successful} users from ${target}`,
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
                                                name: "Not in guild",
                                                value: not_in_guild,
                                                inline: true
                                            },
                                            {
                                                name: "De-authorized",
                                                value: deauthorized,
                                                inline: true
                                            }
                                        ]
                                    }]
                                });

                                resolve();
                            }
                        }
                    });
                });
            });
        }
    });
}