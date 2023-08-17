const fs = require("fs");
const path = require("path");

module.exports = function load_modules() {
    const programs = fs.readdirSync(path.join(__dirname, "prgms"));
    const files = programs.filter((file) => {
        return fs.lstatSync(path.join(__dirname, "prgms", file)).isFile();
    });

    let prgms = {};
    files.forEach((file) => {
        prgms[file.replace(".js", "")] = require(path.join(__dirname, "prgms", file));
    });

    return prgms;
}