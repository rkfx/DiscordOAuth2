const express = require('express');
const fetch = require('node-fetch');
const config = require('./config.json');
const path = require("path");
const initialize_database = require('./oauth2/mysql.js');
const User = require('./oauth2/user.js');
const fs = require("fs");

async function main() {
    const connection = await initialize_database();
    const app = express();

    const root = fs.readFileSync(path.join(__dirname, "./site/root.html")).toString();

    function load_page(page) {
        const content = fs.readFileSync(path.join(__dirname, `./site/${page}.html`)).toString();
        return root.replace("{% Content %}", content);
    }

    app.get('/', async (request, response) => {
        const code = request.query.code;
        const user = new User(connection, true, code);

        try {
            await user.load(code);
        } catch (err) {
            console.log("Failed to authenticate user. " + err);

            switch (err) {
                case "CANNOT_RE_AUTH": return response.send(load_page("cra"));
                default: return response.send(load_page("error"));
            }
        }

        return response.send(load_page("success"));
    });

    app.listen(config.port, () => console.log(`App listening at http://localhost:${config.port}`));
}

main().then();
console.log("Loose exit? Program thread unlocked [unexpected].");