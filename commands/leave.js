module.exports = {
  data: {
    name: 'leave',
    description: 'Leave the voice channel and stop transcribing',
  },
  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return await interaction.reply('ボイスチャンネルに参加してないよ');
    }

    await voiceChannel.leave();
    await interaction.reply('またね');
  },
};
