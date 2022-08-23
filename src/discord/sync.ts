import {
  CategoryChannel,
  ChannelType,
  Collection,
  Guild,
  GuildMember,
  OverwriteType,
  Role,
} from "discord.js";
import { bot } from ".";
import { fetchMembers } from "../etu";

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
      position: (
        guild.channels.cache
          .filter((chan) => chan.type === ChannelType.GuildCategory)
          .sort((chan1, chan2) => chan1.name.localeCompare(chan2.name))
          .find(
            (channel) => channel.name.localeCompare(asso) > 0
          ) as CategoryChannel
      )?.position,
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
        .filter(
          (role) =>
            role.name.endsWith("Ancien") &&
            !role.managed &&
            role.id !== process.env.ASSO_GUILD_ID &&
            role.id !== process.env.MEMBRE_BUREAU_ASSO_ROLE
        )
        .sort((role1, role2) => role1.position - role2.position);
    case RoleType.BUREAU:
      return guild.roles.cache
        .filter(
          (role) =>
            role.name.endsWith("Bureau") &&
            !role.managed &&
            role.id !== process.env.ASSO_GUILD_ID &&
            role.id !== process.env.MEMBRE_BUREAU_ASSO_ROLE
        )
        .sort((role1, role2) => role1.position - role2.position);
    default:
      return guild.roles.cache
        .filter(
          (role) =>
            !role.name.endsWith("Ancien") &&
            !role.name.endsWith("Bureau") &&
            !role.managed &&
            role.id !== process.env.ASSO_GUILD_ID &&
            role.id !== process.env.MEMBRE_BUREAU_ASSO_ROLE
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
  if (roleType === RoleType.ANCIEN)
    return (
      (guild.roles.cache.get(process.env.MEMBRE_BUREAU_ASSO_ROLE as string)
        ?.position ?? 0) + 1
    );
  if (roleType === RoleType.MEMBRE)
    return (
      (filterRolesByType(guild, RoleType.ANCIEN).last()?.position ??
        guild.roles.cache.get(process.env.MEMBRE_BUREAU_ASSO_ROLE as string)
          ?.position ??
        0) + 1
    );
  return (
    (filterRolesByType(guild, RoleType.MEMBRE).last()?.position ??
      filterRolesByType(guild, RoleType.ANCIEN).last()?.position ??
      guild.roles.cache.get(process.env.MEMBRE_BUREAU_ASSO_ROLE as string)
        ?.position ??
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

  for (const [_, member] of members) {
    if (!member.user.bot) {
      const discordTag = `${member.user.username}#${member.user.discriminator}`;
      const roles: Role[] = [];
      let isInBureau = false;
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
              await member.roles.add(
                ancienRole,
                "Synchronisation des rôles (via site étu)"
              );
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
              await member.roles.add(
                bureauRole,
                "Synchronisation des rôles (via site étu)"
              );
              isInBureau = true;
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
              await member.roles.add(
                memberRole,
                "Synchronisation des rôles (via site étu)"
              );
          }
        }
        console.log(
          discordTag,
          roles.map((role) => role.name)
        );
        for (const role of member.roles.cache)
          if (
            role[0] !== process.env.ASSO_GUILD_ID &&
            role[0] !== process.env.MEMBRE_BUREAU_ASSO_ROLE
          )
            if (!roles.find((r) => r.id === role[0]))
              await member.roles.remove(role);
        const bureauMemberRole = guild.roles.cache.get(
          process.env.MEMBRE_BUREAU_ASSO_ROLE as string
        );
        if (isInBureau && bureauMemberRole)
          await member.roles.add(bureauMemberRole);
        else if (bureauMemberRole) await member.roles.remove(bureauMemberRole);
      } else {
        member.roles.cache.forEach((role) => {
          if (role.editable) member.roles.remove(role);
        });
      }
    }
  }
}
