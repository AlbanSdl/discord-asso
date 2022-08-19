// Load the .env file
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { config } from "dotenv";

config();

// List Commands
const commands = [
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Démarre un vote pour bannir un utilisateur")
    .addUserOption(
      new SlashCommandUserOption()
        .setName("target")
        .setDescription("L'utilisateur à bannir")
        .setRequired(true)
    )
    .addStringOption(
      new SlashCommandStringOption()
        .setName("reason")
        .setDescription("Raison du bannissement")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Effectue la synchronisation des rôles sur le serveur"),
].map((command) => command.toJSON());

// Register Commands
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

rest
  .put(Routes.applicationCommands("1009952506006216794"), { body: commands })
  .then(() => console.log("Successfully registered application commands."))
  .catch(console.error);
