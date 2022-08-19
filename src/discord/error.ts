import { MessageOptions } from "discord.js";

const errorRandomMessages = [
  "Ce bot a bien été codé avec le Q",
  ":head_bandage: Aïe! Ceci n'était pas censé arriver...",
  "Et c'est reparti !",
  "Oups j'ai glissé chef :sweat_smile:",
  "UNG, fournisseur de logiciels de qualité depuis 1998",
];

export function generateFatalErrorMessage(): MessageOptions {
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
): MessageOptions {
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
