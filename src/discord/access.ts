import { CategoryChannel, ChannelType, GuildMember } from "discord.js";

export async function toggleView(member: GuildMember, assoIds: string[]) {
  for (const assoId of assoIds) {
    const category = member.guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory && channel.name === assoId
    ) as CategoryChannel;
    if (category) {
      if (category.permissionsFor(member).has("ViewChannel")) {
        await category.permissionOverwrites.delete(member);
      } else {
        await category.permissionOverwrites.create(member, {
          ViewChannel: true,
        });
      }
    }
  }
}
