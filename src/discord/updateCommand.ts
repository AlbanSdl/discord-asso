import { SelectMenuBuilder, TextChannel, ActionRowBuilder } from "discord.js";
import { fetchAssos } from "../etu";

export async function updateToggleMessage(channel: TextChannel) {
  const assos = await fetchAssos();
  return channel.send({
    components: [
      new ActionRowBuilder<SelectMenuBuilder>().addComponents(
        new SelectMenuBuilder()
          .setCustomId("toggle-view")
          .setPlaceholder("Sélectionne une asso")
          .setMinValues(1)
          .addOptions(
            assos.map(({ name, id }) => ({
              value: id,
              label: name,
            }))
          )
      ),
    ],
  });
}
