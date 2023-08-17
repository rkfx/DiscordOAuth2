const autoload = require("./autoload.js");

module.exports = function parse_command(command_string, api) {
    return new Promise(async (resolve, reject) => {
        const prgms = autoload();
        const args = command_string.split(" ") == "" ? [command_string] : command_string.split(" ");
        if (command_string == "") return resolve("IGNORE");

        if (!prgms[args[1]]) return reject("Invalid command '" + args[1] + "', does not exist in programs. Valid commands: " + Object.keys(prgms).join(", "));

        try {
            await prgms[args[1]]({ ...api, args: args.slice(2) }),
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}