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
  EXTRA,
}

function getRoleName<T extends RoleType>(
  asso: string,
  roleType: T,
  ...extra: T extends RoleType.EXTRA ? [string] : []
) {
  switch (roleType) {
    case RoleType.BUREAU:
      return `${asso} - Bureau`;
    case RoleType.ANCIEN:
      return `${asso} - Ancien`;
    case RoleType.EXTRA:
      return `${asso} - ${extra[0]}`;
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
    case RoleType.MEMBRE:
      return process.env.ROLE_MEMBRE_COLOR;
    default:
      return process.env.ROLE_EXTRA_COLOR;
  }
}

/**
 * Retrieves (and creates if it doesn't exist) the category of the association
 * @param guild the guild to use for channel discovery
 * @param asso the name of the association
 * @returns The category of the association
 */
export async function findAssoCategory(guild: Guild, asso: string) {
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

/**
 * Retrieves all roles of the chosen type (eg. {@link RoleType.BUREAU})
 * @param guild the guild (discord server) where are located all the roles
 * @param roleType the role type to look for
 * @returns All the roles of the given type
 */
function filterRolesByType(guild: Guild, roleType: RoleType) {
  switch (roleType) {
    case RoleType.BUREAU:
      return guild.roles.cache
        .filter((role) => role.name.endsWith("- Bureau"))
        .sort((role1, role2) => role1.position - role2.position);
    case RoleType.EXTRA:
      return guild.roles.cache
        .filter((role) => /\s-\s(?!(?:Bureau|Ancien)$)/.test(role.name))
        .sort((role1, role2) => role1.position - role2.position);
    case RoleType.ANCIEN:
      return guild.roles.cache
        .filter((role) => role.name.endsWith("- Ancien"))
        .sort((role1, role2) => role1.position - role2.position);
    case RoleType.MEMBRE:
      // Retrieve position of last `Extra` role (or last `Bureau` role if there is no `Extra` role)
      const positionTop: number =
        filterRolesByType(guild, RoleType.EXTRA).reduce<Role>(
          (acc, role) =>
            acc instanceof Role
              ? acc.position > role.position
                ? role
                : acc
              : role,
          null
        )?.position ??
        filterRolesByType(guild, RoleType.BUREAU).reduce<Role>(
          (acc, role) =>
            acc instanceof Role
              ? acc.position > role.position
                ? role
                : acc
              : role,
          null
        )?.position ??
        guild.roles.cache.get(process.env.BOT_ROLE).position!;
      // Retrieve the position of the first `Ancien` role
      const positionBottom: number =
        filterRolesByType(guild, RoleType.ANCIEN).reduce<Role>(
          (acc, role) =>
            acc instanceof Role
              ? acc.position > role.position
                ? role
                : acc
              : role,
          null
        )?.position ??
        guild.roles.cache.get(process.env.MEMBRE_BUREAU_ASSO_ROLE).position!;
      // Retrieve all roles between these two positions
      return guild.roles.cache
        .filter(
          (role) =>
            role.position < positionTop && role.position > positionBottom
        )
        .sort((role1, role2) => role1.position - role2.position);
  }
}

/**
 * Retrieves the role position where a role should be inserted
 * @param guild the guild where to create the role
 * @param asso the asso name for the role
 * @param roleType the type of membership for the role
 * @returns the position where the role should be created
 */
function findNextRolePosition(guild: Guild, asso: string, roleType: RoleType) {
  const roles = filterRolesByType(guild, roleType);
  if (roles.size) {
    let previousRole: Role | null;
    for (const role of roles.clone().reverse()) {
      if (previousRole && role[1].name.localeCompare(previousRole.name) > 0)
        break; // We reached pinned roles (such as BDE or UNG, break here)
      previousRole = role[1]; // Add this role to check for pinned roles
      if (role[1].name.localeCompare(asso) < 0) return role[1].position; // We should be there
    }
    return previousRole.position + 1; // Use position right before pinned roles
  }

  // Find where the first role should be located
  switch (roleType) {
    case RoleType.ANCIEN:
      return (
        (guild.roles.cache.get(process.env.MEMBRE_BUREAU_ASSO_ROLE)?.position ??
          0) + 1
      );
    case RoleType.MEMBRE:
      (filterRolesByType(guild, RoleType.ANCIEN).first()?.position ??
        guild.roles.cache.get(process.env.MEMBRE_BUREAU_ASSO_ROLE)?.position ??
        0) + 1;
  }
  return (
    (filterRolesByType(guild, RoleType.MEMBRE).first()?.position ??
      filterRolesByType(guild, RoleType.ANCIEN).first()?.position ??
      guild.roles.cache.get(process.env.MEMBRE_BUREAU_ASSO_ROLE)?.position ??
      0) + 1
  );
}

/**
 * Retrieves (and creates if it doesn't exist) the role for a group in the given association
 * @param guild the guild in which the role should be looked for
 * @param asso the name of association this role belongs to
 * @param roleType the type of the role. {@link RoleType See RoleTypes.}
 * @param extra the name of the role (only if of the {@link RoleType.EXTRA EXTRA RoleType})
 * @returns the role used for this group of the association
 */
async function findAssoRole<T extends RoleType>(
  guild: Guild,
  asso: string,
  roleType: T,
  ...extra: T extends RoleType.EXTRA ? [string] : []
) {
  return (
    guild.roles.cache.find(
      (role) => role.name === getRoleName(asso, roleType, ...extra)
    ) ??
    (await guild.roles.create({
      name: getRoleName(asso, roleType, ...extra),
      mentionable: true,
      color: Number(`0x${getRoleColor(roleType)}`),
      hoist: roleType === RoleType.BUREAU,
      position: findNextRolePosition(guild, asso, roleType),
    }))
  );
}

/**
 * Executes the synchronization between EtuUTT and the discord server
 */
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

  const extraRoles = process.env.EXTRA_ROLES.split(/[,;\s]/);

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
              if (extraRoles.includes(`${asso}-${assoMember[asso]}`)) {
                const extraRole = await findAssoRole(
                  guild,
                  asso,
                  RoleType.EXTRA,
                  assoMember[asso]
                );
                roles.push(extraRole);
                // Create channels if they don't exist
                const assoCategory = await findAssoCategory(guild, asso);
                if (
                  !assoCategory.permissionsFor(extraRole).has("ViewChannel")
                ) {
                  assoCategory.permissionOverwrites.edit(extraRole, {
                    ViewChannel: true,
                  });
                }
                await member.roles.add(
                  extraRole,
                  "Synchronisation des rôles (via site étu)"
                );
              } else {
                const memberRole = await findAssoRole(
                  guild,
                  asso,
                  RoleType.MEMBRE
                );
                roles.push(memberRole);
                // Create channels if they don't exist
                const assoCategory = await findAssoCategory(guild, asso);
                if (
                  !assoCategory.permissionsFor(memberRole).has("ViewChannel")
                ) {
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
