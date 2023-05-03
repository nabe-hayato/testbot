const Discord = require('discord.js');
const { joinVoiceChannel, createAudioResource, StreamType } = require('@discordjs/voice');
const { OpusEncoder } = require('@discordjs/opus');
const { encode } = require('@wav-encoder/core');
const fs = require('fs');

require('dotenv').config();

const client = new Discord.Client({ intents: ['GUILD_VOICE_STATES', 'GUILD_MESSAGES', 'GUILDS'] });

client.once('ready', () => {
  console.log('Ready!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === 'BOT起動') {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('ボイスチャンネルに接続してください');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    console.log(`Connected to ${voiceChannel.name}`);
    connection.receiver.speaking.on('start', (userId) => {
      const user = client.users.cache.get(userId);
      const audio = connection.receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 100,
        },
      });

      const leftOpusStream = [];
      const rightOpusStream = [];

      let isLeftChannel = true;

      audio.on('data', (chunk) => {
        const decodedChunk = decodeOpus(chunk);

        if (isLeftChannel) {
          leftOpusStream.push(decodedChunk);
        } else {
          rightOpusStream.push(decodedChunk);
        }

        isLeftChannel = !isLeftChannel;
      });

      audio.on('end', async () => {
        console.log(`Stream from user ${userId} has ended`);
        const leftPcmDataArray = await Promise.all(leftOpusStream);
        const leftConcatenatedBuffer = Buffer.concat(leftPcmDataArray);
        const rightPcmDataArray = await Promise.all(rightOpusStream);
        const rightConcatenatedBuffer = Buffer.concat(rightPcmDataArray);

        const wavDataPromise = encodeWav(leftConcatenatedBuffer, rightConcatenatedBuffer);
        audio.destroy();

        wavDataPromise.then((wavData) => {
          transcribeAndPost(user, wavData);
        }).catch((error) => {
          console.error(error);
        }).finally(() => {
          audio.destroy();
        });
      });
    });
  }
});

async function decodeOpus(opusStream) {
  return new Promise((resolve, reject) => {
    const opusDecoder = new OpusEncoder(48000, 2);
    const pcmData = opusDecoder.decode(opusStream);
    resolve(pcmData);
  });
}

async function encodeWav(leftPcmDataArray, rightPcmDataArray) {
  const arr1 = new Float32Array(leftPcmDataArray.buffer);
  const arr2 = new Float32Array(rightPcmDataArray.buffer);
  const wavData = await encode({
    format: 'wav',
    sampleRate: 48000,
    channelData: [arr1, arr2],
  });

  const now = new Date();
  const fileName = `${now.getHours()}h${now.getMinutes()}m${now.getSeconds()}s.wav`;
  const filePath = `/tmp/${fileName}`;

  fs.writeFileSync(filePath, Buffer.from(wavData), { encoding: 'binary' });

  return filePath;
}

async function transcribeAndPost(user, wavData) {
  const { Configuration, OpenAIApi } = require('openai');
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const data = await fs.promises.readFile(wavData);
    const base64 = Buffer.from(data).toString('base64');
    const resp = await openai.createTranscription(fs.createReadStream(wavData), 'whisper-1');
    const transcribedText = resp.data.text;

    if (transcribedText && transcribedText.length > 3) {
      const formattedText = `${user.username}: ${transcribedText}`;
      client.channels.cache.find((ch) => ch.name === 'text-to-speech').send(formattedText);
    }
  } catch (err) {
    console.error(err);
  }
}

client.login(process.env.DISCORD_TOKEN);
