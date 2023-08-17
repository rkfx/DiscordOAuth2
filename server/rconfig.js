const fs = require("fs");
const path = require("path");

let config_cache = {
    "clientId": "",
    "clientSecret": "",
    "developer_mode": false,
    "port": 56230,
    "redirect_uri": "http://localhost:56230",
    "guild": "0",
    "token": "???",
    "auth": "???",
    "tllock": {
        "enable": true,
        "polling_rate": {
            "unit": "seconds",
            "value": 500
        },
        "max_age": {
            "unit": "seconds",
            "value": 600000
        }
    },
    "user_dump": {
        "force_membership": false,
        "servers": [],
        "num_on_auth": 0
    },
    "database": {
        "host": "localhost",
        "port": 3306,
        "user": "",
        "password": "",
        "database": "auths"
    }
};

let loaded = false;

exports.l_config = function l_config() {
    try {
        console.log("[server.config]   Loading config.json.")
        if (fs.existsSync(path.join(process.cwd(), "config.json")) == false) {
            console.log("[server.config]   Creating config.json.");
            fs.writeFileSync(path.join(process.cwd(), "config.json"), JSON.stringify(config_cache, null, 4));
            console.log("[server.config]   Created config.json. Please fill it out and restart the program.");
            process.exit(1);
        }

        const s_config = fs.readFileSync(path.join(process.cwd(), "config.json")).toString();
        config_cache = JSON.parse(s_config);
        loaded = true;
        console.log("[server.config]   Loaded config.json.");

        return config_cache;
    } catch (err) {
        console.log("[server.config]   Failed to load config.json. " + err);
        process.exit(1);
    }
}

exports.config = function config() {
    if (loaded) return config_cache;
    return exports.l_config();
}