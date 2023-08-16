const mysql = require('mysql');
const config = require('../rconfig').config();
const path = require("path");
const fs = require("fs");

const ERR_TABLE_EXISTS_ERROR = 1050;

module.exports =  function initialize_database() {
    return new Promise((resolve, reject) => {
        const connection = mysql.createConnection({
            host: config.database.host,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database,
        });

        connection.connect(function(err) {
            if (err) {
                console.error(`Error connecting: ${err.stack}`);
                reject(err);
            }

            console.log(`[api.database] Connected as id ${connection.threadId}`);
            create_tables(connection).then(() => {
                resolve(connection);
            }).catch((err) => {
                reject(err);
            });
        });
    });
}

function create_tables(connection) {
    return new Promise((resolve, reject) => {
        // NOTE: Table files contain SQL queries to produce necessary tables.
        const tables_files = fs.readdirSync(path.join(__dirname, "../tables"));
        const tables = tables_files.map((file) => {
            return fs.readFileSync(path.join(__dirname, "../tables", file)).toString().replace(/(\r\n|\n|\r)/gm, " ");
        });

        if (config.developer_mode) {
            connection.query("DROP TABLE IF EXISTS `auth_users`", (err, results, fields) => {});
        }

        let promises_waiting = 0;
        for (const table of tables) {
            promises_waiting++;
            connection.query(table, (err, results, fields) => {
                if (err && err.errno != ERR_TABLE_EXISTS_ERROR) {
                    console.error(`Error creating table: ${err.stack}`);
                    reject(err);
                }

                promises_waiting--;
                if (promises_waiting == 0) {
                    resolve();
                }
            });
        }
    });
}