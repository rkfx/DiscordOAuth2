const {tq_to_ms} = require("../util");
const User = require("../oauth2/user");
const config = require("../rconfig").config();

module.exports = function setup_tllock(connection) {
    if (config.tllock.enable) {
        setInterval(async () => {
            // get all users from `auth_users`
            connection.query("SELECT * FROM `auth_users`", async (err, res) => {
                if (err || res.length === 0) return;
                const users = res; // token_type	access_token	last_refresh_stamp	expire_stamp	refresh_token	did
                for (let i = 0; i < users.length; i++) {
                    const user = users[i];
                    if ((Date.now() - user.last_refresh_stamp) > tq_to_ms(config.tllock.max_age.unit, config.tllock.max_age.value)) {
                        const user_s = new User(connection, false, user.did);
                        user_s.load().then(() => {
                            user_s.refresh().then(() => {
                                console.log(`[discord.tllock] Refreshed ${user.did}.`);
                            }).catch((err) => {
                                console.log(`[discord.tllock] Failed to refresh ${user.did}. ${err}`);
                            });
                        }).catch((err) => {
                            console.log(`[discord.tllock] Failed to load ${user.did}. ${err}`);
                        });
                    }
                }
            });
        }, tq_to_ms(config.tllock.polling_rate.unit, config.tllock.polling_rate.value));
    }
}