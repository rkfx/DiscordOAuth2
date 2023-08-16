const fs = require("fs");
const path = require("path");

let config_cache = {};
let loaded = false;

exports.l_config = function l_config() {
    try {
        const s_config = fs.readFileSync(path.join(process.cwd(), "config.json")).toString();
        config_cache = JSON.parse(s_config);
        loaded = true;

        return config_cache;
    } catch (err) {
        console.log("Failed to load config.json. " + err);
        process.exit(1);
    }
}

exports.config = function config() {
    if (loaded) return config_cache;
    return exports.l_config();
}