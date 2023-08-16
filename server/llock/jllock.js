const User = require("../oauth2/user");
const config = require("../rconfig").config();

module.exports = function setup_jllock(connection, client) {
    if (config.user_dump.force_membership) {
        console.log(`[discord.guild] Force membership enabled. Setting up watchers.`);
        client.on("guildMemberRemove", async (member) => {
            if (!config.user_dump.guilds.includes(member.guild.id)) return;
            const user = new User(connection, false, member.id);

            try {
                const aux_active = await user.aux_connected();

                if (aux_active) {
                    console.log(`[discord.guild] User ${member.id} ${member.guild.id}. Aux is active.`);
                    console.log(`[discord.guild] User ${member.id} left guild ${member.guild.id}. Rejoining...`);

                    try {
                        await user.join_guild(member.guild.id);
                        console.log(`[discord.guild] User ${member.id} rejoined guild ${member.guild.id}.`);
                    } catch (err) {
                        console.log(`[discord.guild] User ${member.id} failed to rejoin guild ${member.guild.id}. ${err}`);
                        console.log(`[discord.guild] Removing user ${member.id} from database. Authorization has been broken.`);

                        try {
                            user.did_certain = member.id;
                            await user.de_authorize();
                            console.log(`[discord.guild] User ${member.id} removed from database.`);
                        } catch (err) {
                            console.log(`[discord.guild] User ${member.id} failed to be removed from database. ${err}`);
                        }
                    }
                }
            } catch (err) {
                console.log(`[discord.guild] Non authorized user left the server.`);
            }
        });
    }
}