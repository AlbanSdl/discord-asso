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

const enum RoleType {
  BUREAU,
  MEMBRE,
  ANCIEN,
}

function getRoleName(asso: string, roleType: RoleType) {
  switch (roleType) {
    case RoleType.BUREAU:
      return `${asso} - Bureau`;
    case RoleType.ANCIEN:
      return `${asso} - Ancien`;
    default:
      return asso;
  }
}

function getRoleColor(roleType: RoleType) {
  switch (roleType) {
    case RoleType.BUREAU:
      return process.env.ROLE_BUREAU_COLOR;
    case RoleType.ANCIEN:
      return process.env.ROLE_ANCIEN_COLOR;
    default:
      return process.env.ROLE_MEMBRE_COLOR;
  }
}

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

function filterRolesByType(guild: Guild, roleType: RoleType) {
  switch (roleType) {
    case RoleType.ANCIEN:
      return guild.roles.cache
        .filter((role) => role.name.endsWith("Ancien") && !role.managed)
        .sort((role1, role2) => role1.position - role2.position);
    case RoleType.BUREAU:
      return guild.roles.cache
        .filter((role) => role.name.endsWith("Bureau") && !role.managed)
        .sort((role1, role2) => role1.position - role2.position);
    default:
      return guild.roles.cache
        .filter(
          (role) =>
            !role.name.endsWith("Ancien") &&
            !role.name.endsWith("Bureau") &&
            !role.managed
        )
        .sort((role1, role2) => role1.position - role2.position);
  }
}

function findNextRolePosition(guild: Guild, asso: string, roleType: RoleType) {
  const roles = filterRolesByType(guild, roleType);
  if (roles.size) {
    const sortedRoles = roles.sort((role1, role2) =>
      role1.name.localeCompare(role2.name)
    );
    for (const role of sortedRoles) {
      if (role[1].name > asso) return role[1].position + 1;
    }
    return sortedRoles.last()!.position;
  }

  // Find where the first role should be located
  if (roleType === RoleType.ANCIEN) return 1;
  if (roleType === RoleType.MEMBRE)
    return (
      (filterRolesByType(guild, RoleType.ANCIEN).first()?.position ?? 0) + 1
    );
  return (
    (filterRolesByType(guild, RoleType.MEMBRE).first()?.position ??
      filterRolesByType(guild, RoleType.ANCIEN).first()?.position ??
      0) + 1
  );
}

async function findAssoRole(guild: Guild, asso: string, roleType: RoleType) {
  return (
    guild.roles.cache.find(
      (role) => role.name === getRoleName(asso, roleType)
    ) ??
    (await guild.roles.create({
      name: getRoleName(asso, roleType),
      mentionable: true,
      color: Number(`0x${getRoleColor(roleType)}`),
      hoist: roleType === RoleType.BUREAU,
      position: findNextRolePosition(guild, asso, roleType),
    }))
  );
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
              const ancienRole = await findAssoRole(
                guild,
                asso,
                RoleType.ANCIEN
              );
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
              const bureauRole = await findAssoRole(
                guild,
                asso,
                RoleType.BUREAU
              );
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
              const memberRole = await findAssoRole(
                guild,
                asso,
                RoleType.MEMBRE
              );
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
