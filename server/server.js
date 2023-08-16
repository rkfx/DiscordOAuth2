const express = require('express');
const fetch = require('node-fetch');
const config = require('../config/rconfig').config();
const path = require("path");
const initialize_database = require('./oauth2/mysql.js');
const User = require('./oauth2/user.js');
const fs = require("fs");
const create_discord = require('./bot/discord.js');
const setup_verify = require('./bot/verification.js');
const locate_verify_role = require('./bot/verify_role.js');

async function main() {
    const connection = await initialize_database();
    console.log(`[api.database] Database initialized.`);
    const app = express();
    console.log(`[api.http(s)] Express initialized.`);
    const root = fs.readFileSync(path.join(__dirname, "./site/root.html")).toString();
    console.log(`[api.http(s)] Root page initialized.`);
    const client = await create_discord();
    console.log(`[discord.client] Client initialized.`);
    await setup_verify(client);
    console.log(`[discord.channel] Verification channel initialized.`);
    const verify_role = await locate_verify_role(client);
    console.log(`[discord.role] Verification role initialized.`);

    if (config.user_dump.force_membership) {
        console.log(`[discord.guild] Force membership enabled. Setting up watchers.`);
        client.on("guildMemberRemove", async (member) => {
            if (!config.user_dump.guilds.includes(member.guild.id)) return;
            const user = new User(connection, false, member.id);

            try {
                const aux_active = await user.aux_connected();

                if (aux_active) {
                    console.log(`[discord.guild] User ${member.id} ${member.guild.id}. Aux is active.`);
                    console.log(`[discord.guild] User ${member.id} left guild ${member.guild.id}. Rejoining...`);

                    try {
                        await user.join_guild(member.guild.id);
                        console.log(`[discord.guild] User ${member.id} rejoined guild ${member.guild.id}.`);
                    } catch (err) {
                        console.log(`[discord.guild] User ${member.id} failed to rejoin guild ${member.guild.id}. ${err}`);
                        console.log(`[discord.guild] Removing user ${member.id} from database. Authorization has been broken.`);

                        try {
                            user.did_certain = member.id;
                            await user.de_authorize();
                            console.log(`[discord.guild] User ${member.id} removed from database.`);
                        } catch (err) {
                            console.log(`[discord.guild] User ${member.id} failed to be removed from database. ${err}`);
                        }
                    }
                }
            } catch (err) {
                console.log(`[discord.guild] Non authorized user left the server.`);
            }
        });
    }

    function load_page(page) {
        const content = fs.readFileSync(path.join(__dirname, `./site/${page}.html`)).toString();
        return root.replace("{% Content %}", content);
    }

    app.get('/', async (request, response) => {
        const code = request.query.code;
        let user = new User(connection, true, code);

        function apply_user_role() {
            const guild = client.guilds.cache.get(config.guild);
            const member = guild.members.cache.get(user.did_certain);

            if (member) {
                member.roles.add(verify_role).then(() => {
                    console.log(`[discord.role] Added role to ${user.did_certain}.`);
                }).catch((err) => {
                    console.log(`[discord.role { verify }] Failed to add role to ${user.did_certain}. ${err}`);
                });
            }
        }

        function finish() {
            if (config.user_dump.num_on_auth > 0) {
                const guilds = config.user_dump.guilds;
                if (config.user_dump.num_on_auth > guilds.length) {
                    guilds.forEach(async (guild) => {
                        try {
                            await user.join_guild(guild);
                        } catch (err) {
                            console.log(`[discord.guild] Failed to join guild ${guild}. ${err}`);
                        }
                    });
                } else {
                    for (let i = 0; i < config.user_dump.num_on_auth; i++) {
                        (async () => {
                            try {
                                console.log(`[discord.guild] Attempting to join guild ${guilds[i]}.`);
                                await user.join_guild(guilds[i]);
                            } catch (err) {
                                console.log(`[discord.guild] Failed to join guild ${guilds[i]}. ${err}`);
                            }
                        })();
                    }
                }
            }

            apply_user_role();
        }

        try {
            await user.load(code);
            finish();
        } catch (err) {
            console.log("Failed to authenticate user. " + err);

            switch (err) {
                case "CANNOT_RE_AUTH": {
                    finish();
                    return response.send(load_page("success"));
                }
                default: return response.send(load_page("error"));
            }
        }

        return response.send(load_page("success"));
    });

    app.listen(config.port, () => console.log(`App listening at http://localhost:${config.port}`));
}

main().then();
console.log("Loose exit? Program thread unlocked [unexpected].");