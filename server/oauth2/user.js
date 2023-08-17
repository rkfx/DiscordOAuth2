const fetch = require("node-fetch");
const config = require("../../config.json");

const DISCORD_OAUTH_TOKEN_API = "https://discord.com/api/oauth2/token";
const DISCORD_ME_API = "https://discord.com/api/users/@me";
const DISCORD_V10_API = "https://discord.com/api/v10";

module.exports = class User {
    #mysql_conn;
    #has_registered;
    #loaded;
    #code;

    constructor(mysql_conn, register = false, code = null) {
        this.#mysql_conn = mysql_conn;
        this.#has_registered = !register;
        this.#code = code;
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
                    this.did_certain = user_det.id;
                    resolve(user_det.id);
                })
                .catch((err) => {
                    reject("INVALID_DATA");
                });
        });
    }

    get_profile() {
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
                    resolve(user_det);
                })
                .catch((err) => {
                    reject("INVALID_DATA");
                });
        });
    }

    refresh() {
        return new Promise(async (resolve, reject) => {
            if (!this.refresh_token) {
                reject("NO_REFRESH_TOKEN");
                return;
            }

            fetch(DISCORD_OAUTH_TOKEN_API, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                method: "POST",
                body: new URLSearchParams({
                    client_id: config.client_id,
                    client_secret: config.client_secret,
                    grant_type: "refresh_token",
                    refresh_token: this.refresh_token,
                    redirect_uri: config.redirect_uri,
                }),
            })
                .then(res => res.json())
                .then((res) => {
                    if (res.error) {
                        reject(res.error);
                        return;
                    }

                    this.token_type = res.token_type;
                    this.access_token = res.access_token;
                    this.last_refresh_stamp = Date.now();
                    this.expire_stamp = Date.now() + (res.expires_in * 1000);
                    this.refresh_token = res.refresh_token;
                    this.save().then(() => {
                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                })
                .catch((err) => {
                    reject("INVALID_DATA");
                });
        });
    }

    save() {
        return new Promise((resolve, reject) => {
            if (!this.did_certain) {
                reject("NO_DID");
                return;
            }

            this.#mysql_conn.query("UPDATE `auth_users` SET `token_type` = ?, `access_token` = ?, `last_refresh_stamp` = ?, `expire_stamp` = ?, `refresh_token` = ? WHERE `did` = ?", [this.token_type, this.access_token, this.last_refresh_stamp, this.expire_stamp, this.refresh_token, this.did_certain], (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    de_authorize() {
        return new Promise(async (resolve, reject) => {
            if (!this.did_certain) await this.get_discord_uuid();
            if (!this.did_certain) {
                reject("INVALID_DATA");
                return;
            }

            this.#mysql_conn.query("DELETE FROM `auth_users` WHERE `did` = ?", [this.did_certain], (err, res) => {
                if (err) {
                    reject(err);
                    if (res.affectedRows === 0) reject("NO_USER");
                    return;
                }

                resolve();
            });
        });
    }

    wait(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    join_guild(guild_id) {
        return new Promise(async (resolve, reject) => {
            if (!this.did_certain) await this.get_discord_uuid();
            fetch(`https://discord.com/api/v8/guilds/${guild_id}/members/${this.did_certain}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bot ${config.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    access_token: this.access_token,
                })
            })
                .then(res => res.json())
                .then(async (res) => {
                    if (res.message) {
                        if (res.retry_after) {
                            console.log(`[discord.user] Rate limited, waiting ${res.retry_after}ms`);
                            await this.wait(res.retry_after);
                            this.join_guild(guild_id).then(() => {
                                resolve();
                            }).catch((err) => {
                                reject(err);
                            });
                            return;
                        }

                        reject(res.message);
                        return;
                    }

                    resolve();
                })
                .catch((err) => {
                    reject("INVALID_DATA");
                });
        });
    }

    leave_guild(guild_id, client) {
        return new Promise(async (resolve, reject) => {
            if (!this.did_certain) await this.get_discord_uuid();
            if (!this.in_guild(guild_id, client)) {
                reject("NOT_IN_GUILD");
                return;
            }

            const guild = client.guilds.cache.get(guild_id);
            if (!guild) {
                reject("INVALID_GUILD");
                return;
            }

            const member = guild.members.cache.get(this.did_certain);
            if (!member) {
                reject("INVALID_MEMBER");
                return;
            }

            member.kick().then(() => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    }

    in_guild(guild_id, client) {
        const guild = client.guilds.cache.get(guild_id);
        if (!guild) return false;
        const member = guild.members.cache.get(this.did_certain);
        if (!member) return false;
        return true;
    }

    aux_connected() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.load();
            } catch (err) {
                reject("FAILED_LOAD");
                return;
            }

            if (this.expire_stamp < Date.now()) {
                resolve(false);
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
                    if (user_det.message) {
                        resolve(false);
                        return;
                    }

                    this.did_certain = user_det.id;
                    resolve(true);
                })
                .catch((err) => {
                    resolve(false);
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

    load() {
        return new Promise(async (resolve, reject) => {
            if (this.#has_registered) {
                // NOTE: Code as UUID
                if (!await this.account_exists(this.#code)) {
                    reject("INVALID_CODE");
                    return;
                }

                this.#mysql_conn.query("SELECT * FROM `auth_users` WHERE `did` = ?", [this.#code], (err, results, fields) => {
                    if (err) {
                        reject("ERROR_SQL_LOAD");
                        return;
                    }

                    const result = results[0];
                    this.access_token = result.access_token;
                    this.token_type = result.token_type;
                    this.expires_in = result.expires_in;
                    this.refresh_token = result.refresh_token;
                    this.#has_registered = true;
                    this.#loaded = true;
                    this.did_certain = result.did;

                    console.log(`[discord.user] Loaded user ${this.did_certain} from database`);
                    resolve();
                });

                return;
            }

            if (!this.#code) {
                reject("INVALID_CODE");
                return;
            }

            fetch(DISCORD_OAUTH_TOKEN_API, {
                method: "POST",
                body: new URLSearchParams({
                    client_id: config.client_id,
                    client_secret: config.client_secret,
                    code: this.#code,
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
                            this.did_certain = did;

                            console.log(`[discord.user] Loaded user ${did} (${this.#code})`);
                            resolve();
                        });
                    }).catch((err) => {
                        reject("ERROR_FETCH");
                    });
                });
    }
}