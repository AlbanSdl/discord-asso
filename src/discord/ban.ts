import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Snowflake,
  User,
} from "discord.js";
import { bot } from ".";
import { generateVote } from "./vote";

const userBans: Array<{
  votes: Snowflake[];
  user: User;
  reason?: string;
  interaction: ChatInputCommandInteraction;
}> = [];

const BAN_VOTE_COUNT = parseInt(process.env.BAN_VOTE_COUNT!) || 15;

export function banUser(interaction: ChatInputCommandInteraction) {
  const remoteTarget = interaction.options.getUser("target", true);
  const id =
    userBans.push({
      votes: [interaction.member.user.id],
      user: remoteTarget,
      reason: interaction.options.getString("reason", false),
      interaction: interaction,
    }) - 1;
  updateBanVoteMessage(id);
}

export function banUserUpdate(interaction: ButtonInteraction) {
  const updateContent = interaction.customId.match(/^ban_(yes|no)_(\d+)$/)!;
  const banId = Number(updateContent[2]);
  const ban = userBans[banId];

  if (!ban) return;

  if (updateContent[1] === "yes") {
    if (interaction.user.id !== ban.user.id) {
      if (!ban.votes.includes(interaction.user.id))
        ban.votes.push(interaction.user.id);
      else ban.votes.splice(ban.votes.indexOf(interaction.user.id), 1);
      if (updateBanVoteMessage(banId)) {
        bot.guilds
          .resolve(process.env.ASSO_GUILD_ID!)!
          .members.resolve(ban.user)!
          .ban({
            reason: ban.reason,
          });
      }
    }
  } else {
    if (interaction.user.id !== ban.user.id) {
      updateBanVoteMessage(banId, interaction.user);
      userBans[banId] = null;
    }
  }

  interaction.deferUpdate();
}

function updateBanVoteMessage(id: number, cancelledBy?: User) {
  const ban = userBans[id];

  if (!ban) return false;

  const banResult = BAN_VOTE_COUNT <= ban.votes.length;

  generateVote(
    ban.interaction,
    `**Procédure de ban de <@!${ban.user.id}>**\n<@!${
      ban.interaction.member.user.id
    }> a lancé une procédure de banissement. ${
      cancelledBy
        ? `Le vote a été fermé (et annulé) par <@!${cancelledBy.id}>.`
        : banResult
        ? "A la suite du vite, l'utilisateur a été banni du serveur :wave:"
        : `Il reste ${
            BAN_VOTE_COUNT - ban.votes.length
          } votes pour que le ban soit appliqué.`
    }${
      ban.reason ? `\n*Raison: ${ban.reason}*` : ""
    }\n\nVotes pris en compte: ${ban.votes
      .map((user) => `<@!${user}>`)
      .join(", ")}`,
    {
      customId: `ban_yes_${id}`,
      style: ButtonStyle.Success,
      label: `Pour (${Math.min(BAN_VOTE_COUNT, ban.votes.length)} vote${
        ban.votes.length > 1 ? "s" : ""
      })`,
      emoji: "✔️",
      disabled: banResult || !!cancelledBy,
    },
    {
      customId: `ban_no_${id}`,
      style: ButtonStyle.Danger,
      label: `Contre`,
      emoji: "✖️",
      disabled: banResult || !!cancelledBy,
    }
  );
  return banResult;
}
