const express = require('express');
const fetch = require('node-fetch');
const config = require('./config.json');
const path = require("path");
const initialize_database = require('./oauth2/mysql.js');
const User = require('./oauth2/user.js');

async function main() {
    const connection = await initialize_database();
    const app = express();

    app.get('/', async (request, response) => {
        const code = request.query.code;
        const user = new User(connection, true, code);

        try {
            await user.load(code);
        } catch (err) {
            console.log("Failed to authenticate user. " + err);

            switch (err) {
                case "CANNOT_RE_AUTH": return response.sendFile("./site/cra.html", { root: '.' });
                default: return response.sendFile("./site/error.html", { root: '.' });
            }
        }

        return response.sendFile("./site/root.html", { root: '.' });
    });

    app.listen(config.port, () => console.log(`App listening at http://localhost:${config.port}`));
}

main().then();
console.log("Loose exit? Program thread unlocked [unexpected].");