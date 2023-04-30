import os
import discord
from discord.ext import commands
import openai
import nest_asyncio
import ffmpeg

nest_asyncio.apply()

# Config
TOKEN = os.getenv('DISCORD_BOT_TOKEN')
openai.api_key = os.getenv('WHISPER_API_KEY')

# Bot instance
bot = commands.Bot(command_prefix='!')

@bot.event
async def on_ready():
    print(f'{bot.user.name} has connected to Discord!')

@bot.command()
async def join(ctx):
    channel = ctx.author.voice.channel
    await channel.connect()

@bot.command()
async def leave(ctx):
    await ctx.voice_client.disconnect()

async def transcribe_audio(audio_data):
    response = openai.Audio.create(
        data=audio_data,
        sample_rate=16000,
        format="S16LE",
        channels=1,
        language_code="ja-JP",
        model="whisper",
    )
    return response['transcript']

@bot.event
async def on_voice_state_update(member, before, after):
    if before.channel is None and after.channel is not None:  # User joined a voice channel
        if member.bot:
            return

        if not after.self_deaf:
            voice_client = discord.utils.get(bot.voice_clients, guild=member.guild)
            if voice_client is None or (voice_client.channel != after.channel):
                await after.channel.connect()

            def check_audio_source():
                return member.voice.channel == voice_client.channel

            audio_source = discord.FFmpegPCMAudio(executable="ffmpeg", source="-", pipe=True)
            voice_client.play(audio_source)

            audio_data = audio_source.read()
            transcript = await transcribe_audio(audio_data)

            text_channel = discord.utils.get(member.guild.text_channels, name='text_channel')
            if text_channel is not None:
                await text_channel.send(f"{member.display_name}: {transcript}")

        if voice_client is not None and not voice_client.channel.members:
            await voice_client.disconnect()

# Run bot
bot.run(TOKEN)
