import { InteractionEditReplyOptions, MessagePayload } from "discord.js";

const errorRandomMessages = [
  "Ce bot a bien été codé avec le Q",
  ":head_bandage: Aïe! Ceci n'était pas censé arriver...",
  "Et c'est reparti !",
  "Oups j'ai glissé chef :sweat_smile:",
  "UNG, fournisseur de logiciels de qualité depuis 1998",
];

export function generateFatalErrorMessage():
  | MessagePayload
  | InteractionEditReplyOptions {
  return generateErrorMessage(
    "Une erreur est survenue !",
    `*${
      errorRandomMessages[
        Math.trunc(Math.random() * errorRandomMessages.length)
      ]
    }*`
  );
}

export function generateErrorMessage(
  title: string,
  content: string
): MessagePayload | InteractionEditReplyOptions {
  return {
    embeds: [
      {
        color: 0xed4245,
        title,
        description: content,
      },
    ],
  };
}
