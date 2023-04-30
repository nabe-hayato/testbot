const Discord = require('discord.js');
const axios = require('axios');
const ffmpeg = require('ffmpeg-static');
const client = new Discord.Client({
    intents: [Discord.Intents.FLAGS.Guilds, Discord.Intents.FLAGS.GuildMessageContent]
});

async function transcribe(connection) {
    const receiver = connection.receiver.createStream(null, { mode: 'pcm', end: 'manual' });
    const ffmpegProcess = require('child_process').spawn(ffmpeg, [
        '-i', 'pipe:0',
        '-f', 's16le',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'ignore'] });

    receiver.pipe(ffmpegProcess.stdin);
    ffmpegProcess.stdout.pipe(process.stdout);

    // �����ݒ�
    const apiKey = process.env.OPENAI_API_KEY;
    const apiUrl = 'https://api.openai.com/v1/engines/whisper/asr';
    const headers = {
        'Content-Type': 'audio/x-raw',
        'Authorization': `Bearer ${apiKey}`,
    };

    try {
        const response = await axios.post(apiUrl, ffmpegProcess.stdout, {
            headers: headers,
            responseType: 'json',
        });
        const transcription = response.data.choices[0].text.trim();
        console.log('Transcription:', transcription);
    } catch (error) {
        console.error('Error:', error);
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // �{�C�X�`�����l���ɎQ������R�}���h
    if (message.content === '!join') {
        if (message.member.voice.channel) {
            const connection = await message.member.voice.channel.join();
        } else {
            message.reply('�{�C�X�`�����l���ɎQ�����Ă��������B');
        }
    }

    // �{�C�X�`�����l������ޏo����R�}���h
    if (message.content === '!leave') {
        if (message.guild.me.voice.channel) {
            message.guild.me.voice.channel.leave();
        } else {
            message.reply('Bot�̓{�C�X�`�����l���ɎQ�����Ă��܂���B');
        }
    }

    // �{�C�X�`�����l���ɎQ�����ĉ������e�L�X�g�ɕϊ�
    if (message.content === '!transcribe') {
        if (message.member.voice.channel) {
            const connection = await message.member.voice.channel.join();
            transcribe(connection);
        } else {
            message.reply('�{�C�X�`�����l���ɎQ�����Ă��������B');
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
