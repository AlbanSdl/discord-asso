import {
  ActionRowBuilder,
  CategoryChannel,
  ChannelType,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { fetchAssos } from "../etu";

export async function toggleView(member: GuildMember, assoId: string) {
  const assos = await fetchAssos();
  const asso = assos.find(
    ({ name, id }) =>
      name.toLocaleLowerCase() === assoId.toLocaleLowerCase() ||
      id.toLocaleLowerCase() === assoId.toLocaleLowerCase()
  );
  if (!asso) return 0;

  const category = member.guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      (channel.name.toLocaleLowerCase() === asso.name.toLocaleLowerCase() ||
        channel.name.toLocaleLowerCase() === asso.name.toLocaleLowerCase())
  ) as CategoryChannel;
  if (category) {
    if (category.permissionsFor(member).has("ViewChannel")) {
      await category.permissionOverwrites.delete(member);
      return {
        event: "left",
        asso,
      };
    } else {
      await category.permissionOverwrites.edit(member, {
        ViewChannel: true,
        Connect: true,
        Stream: true,
      });
      return {
        event: "joined",
        asso,
      };
    }
  }
  return 0;
}

export function buildModal() {
  const modal = new ModalBuilder()
    .setCustomId("toggle-asso")
    .setTitle("Rejoindre/Quitter une asso");

  const assoName = new TextInputBuilder()
    .setCustomId("asso-name")
    .setLabel("Nom complet de l'asso (comme sur EtuUTT)")
    .setStyle(TextInputStyle.Short);

  const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    assoName
  );

  modal.addComponents(actionRow);
  return modal;
}
