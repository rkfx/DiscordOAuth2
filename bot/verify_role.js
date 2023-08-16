const config = require("../config.json");

module.exports = function locate_verify_role(client) {
    return new Promise(async (resolve, reject) => {
        const guild = client.guilds.cache.get(config.guild);
        if (!guild) {
            reject("NO_VERIFY_GUILD");
            return;
        }

        const role = guild.roles.cache.find(role => role.name.toLowerCase().includes("verified"));
        if (role) {
            resolve(role);
            return;
        }

        reject("NO_VERIFY_ROLE");
    });
}