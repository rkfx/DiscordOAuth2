const config = require("../rconfig").config();

module.exports = class Bank {
    #db;
    #client;
    #cfg;

    constructor(connection, client, config_el) {
        this.#db = connection;
        this.#client = client;
        this.#cfg = config_el;
    }

    setup() {
        return new Promise((resolve, reject) => {
            this.channel = this.#client.channels.cache.get(this.#cfg.id);
        });
    }
}