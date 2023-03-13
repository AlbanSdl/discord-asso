import {
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Snowflake,
  APIEmbedField,
} from "discord.js";

export async function updateToggleMessage(channel: TextChannel) {
  return channel.send({
    embeds: [
      {
        title: "Rejoindre les channels d'une asso en tant que simple visiteur",
        fields: [
          {
            name: "1. Clique sur le bouton à la fin de ce message",
            value: "Ça va t'ouvrir une popup",
          },
          {
            name: "2. Entre le nom de l'asso",
            value:
              "Tu peux saisir le nom de l'asso tel qu'il apparait sur EtuUTT (https://etu.utt.fr/orgas) ou bien son id, si tu le connais (par exemple `ung` pour `UTT Net Group`)",
          },
          {
            name: "3. C'est fait :white_check_mark:",
            value: "Tu as désormais accès aux channels de l'asso choisie",
          },
          {
            name: "Tu veux quitter les channels de l'asso ?",
            value:
              "Pas de soucis, répète la démarche ci-dessus pour quitter les channels !",
          },
        ],
        provider: {
          name: "Bot réalisé par Vieuxthon#7503",
        },
      },
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("toggle-asso-popup")
          .setStyle(ButtonStyle.Primary)
          .setLabel("Choisir une asso")
      ),
    ],
  });
}

export async function updateAdepteMessage(channel: TextChannel) {
  return createRoleMessage({
    role: "adepte",
    title: "Rejoindre les adeptes de la salle asso",
    description: [
      {
        name: "Tu passes souvent en salle asso ? Ce rôle est fait pour toi !",
        value:
          "Que tu passes régulièrement en salle asso ou que tu restes h24 en salle asso pour taper ton meilleur master ~~SSI~~ associatif, ce rôle te permettra de communiquer facilement avec tous ceux qui vont en salle asso: *un sweat oublié, le planning du ménage, etc*",
      },
    ],
    channel,
  });
}

export async function createRoleMessage(options: {
  role: Snowflake;
  channel: TextChannel;
  title: string;
  descriptionString?: string;
  description?: APIEmbedField[];
}) {
  return options.channel.send({
    embeds: [
      {
        title: options.title,
        description: options.descriptionString,
        fields: [
          ...(options.description ?? []),
          {
            name: "Obtenir le rôle",
            value:
              "T'es convaincu ? Clique sur le bouton pour obtenir le rôle ! *(Tu pourras cliquer à nouveau dessus pour l'enlever :confounded:)*",
          },
        ],
        provider: {
          name: "Bot réalisé par Vieuxthon#7503",
        },
      },
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`toggle-role-${options.role}`)
          .setStyle(ButtonStyle.Primary)
          .setLabel("Obtenir le rôle")
      ),
    ],
  });
}
