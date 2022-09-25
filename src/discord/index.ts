import {
  ActivityType,
  Client,
  GuildMember,
  GuildMemberRoleManager,
  TextChannel,
} from "discord.js";
import { syncRoles } from "./sync";
import { generateErrorMessage, generateFatalErrorMessage } from "./error";
import { buildModal, toggleView } from "./access";
import { updateToggleMessage, updateAdepteMessage } from "./messages";

export const bot = new Client({
  intents: ["Guilds", "GuildMembers"],
  presence: {
    status: "online",
    activities: [
      {
        name: "EtuUTT",
        type: ActivityType.Listening,
      },
    ],
  },
});

bot.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.channel instanceof TextChannel && interaction.inGuild()) {
      try {
        switch (interaction.commandName) {
          case "sync":
            await interaction.deferReply({
              ephemeral: true,
            });
            await syncRoles();
            interaction.editReply({
              content: "Synchronisation effectuée.",
            });
            break;
          case "update-command":
            await interaction.deferReply({
              ephemeral: true,
            });
            await updateToggleMessage(interaction.channel);
            interaction.editReply("Message envoyé");
            break;
          case "adepte":
            await interaction.deferReply({
              ephemeral: true,
            });
            await updateAdepteMessage(interaction.channel);
            interaction.editReply("Message envoyé");
            break;
          default:
            await interaction.deferReply({
              ephemeral: true,
            });
            interaction.editReply(
              generateErrorMessage(
                "Commande inconnue",
                "La commande n'existe pas."
              )
            );
        }
      } catch (error) {
        interaction.editReply(generateFatalErrorMessage());
        console.error(error);
      }
    } else {
      await interaction.deferReply({
        ephemeral: true,
      });
      interaction.editReply(
        generateErrorMessage(
          "Erreur",
          "Tu ne peux pas effectuer cette commande dans tes DM"
        )
      );
    }
  } else if (interaction.isButton()) {
    if (interaction.customId === "toggle-asso-popup") {
      interaction.showModal(buildModal());
    } else if (interaction.customId === "toggle-adepte") {
      await interaction.deferReply({
        ephemeral: true,
      });
      if (
        (interaction.member.roles as GuildMemberRoleManager).cache.has(
          process.env.ADEPTE_ROLE
        )
      ) {
        await (interaction.member.roles as GuildMemberRoleManager).remove(
          process.env.ADEPTE_ROLE
        );
        interaction.editReply("Rôle enlevé");
      } else {
        (interaction.member.roles as GuildMemberRoleManager).add(
          process.env.ADEPTE_ROLE
        );
        interaction.editReply("Rôle ajouté");
      }
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === "toggle-asso") {
      await interaction.deferReply({
        ephemeral: true,
      });
      const asso = interaction.fields.getTextInputValue("asso-name");
      const executed = await toggleView(
        interaction.member as GuildMember,
        asso
      );
      await interaction.editReply(
        executed
          ? `Tu viens de ${
              executed.event === "joined" ? "rejoindre" : "quitter"
            } les channels de *${executed.asso.name}*`
          : `L'asso *${asso}* n'existe pas !`
      );
    }
  }
});

bot.on("error", async (error) => {
  /* Disables spam error messages like websockets errors or connection resets from Discord API */
  if (
    !error.message.match(/Invalid WebSocket frame/i) &&
    !error.message.match(/ECONNRESET/i)
  )
    console.log(error);
});

bot.login();
