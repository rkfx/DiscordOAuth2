const subc = require("../subc.js");

module.exports = function config(api) {
    return subc(api.args, {
        "get": () => {
            api.message.reply({
                embeds: [{
                    title: "Bot Configuration",
                    description: "```json\n" + JSON.stringify(api.config, null, 4) + "```"
                }]
            });
        }
    });
}