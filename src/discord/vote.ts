import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponentData,
  ChatInputCommandInteraction,
  ComponentType,
} from "discord.js";

export function generateVote(
  interaction: ChatInputCommandInteraction,
  textMessage: string,
  ...options: Partial<ButtonComponentData>[]
) {
  const actions: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder();
  for (const option of options)
    actions.addComponents(
      new ButtonBuilder({ ...option, type: ComponentType.Button })
    );
  interaction.editReply({
    content: textMessage,
    components: [actions],
  });
}
