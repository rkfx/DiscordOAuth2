const express = require('express');
const fetch = require('node-fetch');
const config = require('./rconfig').config();
const path = require("path");
const initialize_database = require('./oauth2/mysql.js');
const User = require('./oauth2/user.js');
const fs = require("fs");
const create_discord = require('./bot/discord.js');
const setup_verify = require('./bot/verification.js');
const locate_verify_role = require('./bot/verify_role.js');
const setup_jllock = require('./llock/jllock.js');
const setup_tllock = require('./llock/tllock.js');

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
    await setup_jllock(connection, client);
    console.log(`[discord.guild] Join/leave lock initialized.`);
    await setup_tllock(connection, client);
    console.log(`[discord.guild] Token lock initialized.`);

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