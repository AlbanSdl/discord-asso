import {
  CategoryChannel,
  ChannelType,
  Collection,
  Guild,
  GuildMember,
  OverwriteType,
  Role,
} from "discord.js";
import { bot } from "./src/discord";
import { fetchMembers } from "./src/etu";

async function findAssoCategory(guild: Guild, asso: string) {
  return (guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory && channel.name === asso
  ) ??
    guild.channels.create({
      name: asso,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          type: OverwriteType.Role,
          id: guild.roles.everyone.id,
          deny: ["ViewChannel"],
        },
      ],
    })) as CategoryChannel;
}

export async function syncRoles() {
  const assoMembers = await fetchMembers();
  const guild = bot.guilds.resolve(process.env.ASSO_GUILD_ID as string);
  if (!guild) return;

  let members = new Collection<string, GuildMember>();
  do {
    members = members.concat(
      await guild.members.list({
        limit: 1000,
        after: members.lastKey(),
      })
    );
  } while (members.size < guild.memberCount);

  members.forEach(async (member) => {
    if (!member.user.bot) {
      const discordTag = `${member.user.username}#${member.user.discriminator}`;
      const roles: Role[] = [];
      if (discordTag in assoMembers) {
        const assoMember = assoMembers[discordTag];
        for (const asso in assoMember) {
          switch (assoMember[asso].toLowerCase()) {
            case "ancien":
            case "anciens":
              const ancienRole =
                guild.roles.cache.find(
                  (role) => role.name === `${asso} - Ancien`
                ) ??
                (await guild.roles.create({
                  name: `${asso} - Ancien`,
                  mentionable: true,
                  reason: `Création du rôle Ancien pour ${asso}: ${discordTag} fait partie des anciens de l'asso`,
                  color: Number(`0x${process.env.ROLE_ANCIEN_COLOR}`),
                  hoist: false,
                  position:
                    (
                      guild.roles.cache
                        .filter((role) => role.name.endsWith("Ancien"))
                        .sorted((a, b) => a.position - b.position)
                        .last() ??
                      guild.roles.cache
                        .sorted((a, b) => a.position - b.position)
                        .last()!
                    ).position - 1,
                }));
              roles.push(ancienRole);
              // Create channels if they don't exist
              const ancien_category = await findAssoCategory(guild, asso);
              if (
                !ancien_category.permissionsFor(ancienRole).has("ViewChannel")
              ) {
                ancien_category.permissionOverwrites.edit(ancienRole, {
                  ViewChannel: true,
                });
              }
              break;
            case "bureau":
              const bureauRole =
                guild.roles.cache.find(
                  (role) => role.name === `${asso} - Bureau`
                ) ??
                (await guild.roles.create({
                  name: `${asso} - Bureau`,
                  mentionable: true,
                  reason: `Création du rôle Bureau pour ${asso}: ${discordTag} fait partie du bureau`,
                  color: Number(`0x${process.env.ROLE_BUREAU_COLOR}`),
                  hoist: true,
                  position:
                    (
                      guild.roles.cache
                        .filter((role) => role.name.endsWith("Bureau"))
                        .sorted((a, b) => a.position - b.position)
                        .last() ?? { position: guild.roles.cache.size }
                    ).position - 1,
                }));
              roles.push(bureauRole);
              // Create channels if they don't exist
              const category = await findAssoCategory(guild, asso);
              if (!category.permissionsFor(bureauRole).has("ViewChannel")) {
                category.permissionOverwrites.edit(bureauRole, {
                  ManageChannels: true,
                  ManageMessages: true,
                  ManageThreads: true,
                  ViewChannel: true,
                  ManageRoles: true,
                });
              }
            default:
              const memberRole =
                guild.roles.cache.find((role) => role.name === asso) ??
                (await guild.roles.create({
                  name: asso,
                  mentionable: true,
                  reason: `Création du rôle Membre pour ${asso}: ${discordTag} fait partie de l'asso`,
                  color: Number(`0x${process.env.ROLE_MEMBRE_COLOR}`),
                  hoist: false,
                  position:
                    guild.roles.cache
                      .filter((role) => role.name.endsWith("Ancien"))
                      .sorted((a, b) => a.position - b.position)
                      .first()?.position ??
                    guild.roles.cache
                      .sorted((a, b) => a.position - b.position)
                      .last()!.position - 1,
                }));
              roles.push(memberRole);
              // Create channels if they don't exist
              const assoCategory = await findAssoCategory(guild, asso);
              if (!assoCategory.permissionsFor(memberRole).has("ViewChannel")) {
                assoCategory.permissionOverwrites.edit(memberRole, {
                  ViewChannel: true,
                });
              }
          }
        }
        console.log(
          discordTag,
          roles.map((role) => role.name)
        );
        for (const role of member.roles.cache)
          if (!roles.find((r) => r.id === role[0])) member.roles.remove(role);
        for (const role of roles)
          member.roles.add(role, "Synchronisation des rôles (via site étu)");
      } else {
        member.roles.cache.forEach((role) => {
          if (role.editable) member.roles.remove(role);
        });
      }
    }
  });
}
