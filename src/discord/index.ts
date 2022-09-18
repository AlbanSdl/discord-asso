import { ActivityType, Client, GuildMember, TextChannel } from "discord.js";
import { syncRoles } from "./sync";
import { generateErrorMessage, generateFatalErrorMessage } from "./error";
import { toggleView } from "./access";
import { updateToggleMessage } from "./updateCommand";

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
            await updateToggleMessage(interaction.channel);
            interaction.deferReply();
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
  } else if (interaction.isSelectMenu()) {
    if (interaction.customId === "toggle-view") {
      await toggleView(interaction.member as GuildMember, interaction.values);
      interaction.deferUpdate();
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
