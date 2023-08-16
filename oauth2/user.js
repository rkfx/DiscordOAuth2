const fetch = require("node-fetch");
const config = require("../config.json");

const DISCORD_OAUTH_TOKEN_API = "https://discord.com/api/oauth2/token";
const DISCORD_ME_API = "https://discord.com/api/users/@me";
module.exports = class User {
    #mysql_conn;
    #has_registered;
    #loaded;

    constructor(mysql_conn, register = false, code = null) {
        this.#mysql_conn = mysql_conn;
        this.#has_registered = !register;
        this.#loaded = false;
    }

    get_discord_uuid() {
        return new Promise((resolve, reject) => {
            if (!this.access_token || !this.token_type) {
                reject("NO_ACCESS_TOKEN");
                return;
            }

            fetch(DISCORD_ME_API, {
                method: "GET",
                headers: {
                    "Authorization": `${this.token_type} ${this.access_token}`,
                },
            })
                .then(res => res.json())
                .then((user_det) => {
                    resolve(user_det.id);
                })
                .catch((err) => {
                    reject("INVALID_DATA");
                });
        });
    }

    account_exists(d_id) {
        return new Promise((resolve, reject) => {
            this.#mysql_conn.query("SELECT * FROM `auth_users` WHERE `did` = ?", [d_id], (err, results, fields) => {
                if (err) {
                    reject("ERROR_SQL_DID");
                    return;
                }

                resolve(results.length > 0);
            });
        });
    }

    load(code) {
        return new Promise(async (resolve, reject) => {
            if (this.#has_registered) {
                // This will load this account from the database
                return;
            }

            if (!code) {
                reject("INVALID_CODE");
                return;
            }

            fetch(DISCORD_OAUTH_TOKEN_API, {
                method: "POST",
                body: new URLSearchParams({
                    client_id: config.client_id,
                    client_secret: config.client_secret,
                    code,
                    grant_type: "authorization_code",
                    redirect_uri: config.redirect_uri,
                }),
            })
                .then(res => res.json())
                .then(async (token_det) => {
                    if (token_det.error) {
                        reject("CODE_ERROR");
                        return;
                    }

                    this.access_token = token_det.access_token;
                    this.token_type = token_det.token_type;
                    this.expires_in = token_det.expires_in;
                    this.refresh_token = token_det.refresh_token;

                    const expire_stamp = Date.now() + (this.expires_in * 1000);
                    const last_refresh_stamp = Date.now();
                    const did = await this.get_discord_uuid();

                    if (await this.account_exists(did)) {
                        reject("CANNOT_RE_AUTH");
                        return;
                    }

                    this.#mysql_conn.query(
                        "INSERT INTO auth_users (token_type, access_token, last_refresh_stamp, expire_stamp, refresh_token, did) VALUES (?, ?, ?, ?, ?, ?)",
                        [this.token_type, this.access_token, last_refresh_stamp, expire_stamp, this.refresh_token, did],
                        (err) => {
                            if (err) {
                                reject("ERROR_SQL");
                                return;
                            }

                            this.#has_registered = true;
                            this.#loaded = true;
                            resolve();
                        });
                    }).catch((err) => {
                        reject("ERROR_FETCH");
                    });
                });
    }
}