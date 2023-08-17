module.exports = function subc(args, commands) {
    return new Promise(async (resolve, reject) => {
        if (Object.keys(commands).includes(args[0])) {
            try {
                resolve(await commands[args[0]](args.slice(1)))
            } catch (err) {
                reject(err);
            }
        }

        reject("Invalid subcommand '" + args[0] + "'");
    });
}