module.exports = {
  data: {
    name: 'join',
    description: 'Join the voice channel and start transcribing',
  },
  async execute(interaction, whisperClient) {
    if (interaction.member.voice.channel) {
      const connection = await interaction.member.voice.channel.join();
      const receivers = new Map();

      connection.on('speaking', (user, speaking) => {
        if (speaking.bitfield === 1) {
          if (!receivers.has(user.id)) {
            const receiver = connection.receiver.createStream(user, { mode: 'pcm', end: 'manual' });
            receivers.set(user.id, receiver);

            receiver.on('data', async chunk => {
              const transcript = await whisperClient.recognize(chunk, { encoding: 'LINEAR16', sampleRateHertz: 16000 });
              if (transcript) {
                const textChannel = interaction.guild.channels.cache.find(channel => channel.name === 'transcriptions');
                textChannel.send(`${user.username}: ${transcript}`);
              }
            });

            receiver.on('end', () => {
              receivers.delete(user.id);
            });
          }
        } else {
          if (receivers.has(user.id)) {
            const receiver = receivers.get(user.id);
            receiver.emit('end');
          }
        }
      });

      await interaction.reply('ボイスチャンネルに参加しました。');
    } else {
      await interaction.reply('先にボイスチャンネルに参加してください。');
    }
  },
};
