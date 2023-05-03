const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { WhisperASR } = require('@openai/whisper');

require('dotenv').config();

const client = new Client({ intents: [Intents.FLAGS.Guilds, Intents.FLAGS.GuildVoiceStates, Intents.FLAGS.GuildMessages] });
const whisperClient = new WhisperASR(process.env.WHISPER_API_KEY);

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, whisperClient);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
