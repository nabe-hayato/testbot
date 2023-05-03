import discord
import openai
import os

TOKEN = os.environ['DISCORD_BOT_TOKEN']
WHISPER_API_KEY = os.environ['WHISPER_API_KEY']

openai.api_key = WHISPER_API_KEY

async def transcribe_audio(audio_data):
    response = openai.Audio.transcribe(data=audio_data)
    return response.get("transcript")

async def handle_audio_data(audio_data, text_channel):
    text = await transcribe_audio(audio_data)
    if text:
        await text_channel.send(text)

class MyAudioReceiver(discord.AudioSource):
    def __init__(self, client, text_channel):
        self.client = client
        self.text_channel = text_channel

    def cleanup(self):
        pass

    async def read(self):
        while True:
            audio_data = await self.client.ws.recv()
            if audio_data:
                await handle_audio_data(audio_data, self.text_channel)

class VoiceToTextBot(discord.Client):
    async def on_ready(self):
        print(f'We have logged in as {self.user}')

    async def on_message(self, message):
        if message.author == self.user:
            return

        if message.content.startswith('$join'):
            channel = message.author.voice.channel
            if channel:
                await channel.connect()
                print(f"Bot connected to {channel.name}")

        if message.content.startswith('$leave'):
            for vc in self.voice_clients:
                if vc.channel == message.author.voice.channel:
                    await vc.disconnect()
                    print(f"Bot disconnected from {vc.channel.name}")

    async def on_voice_state_update(self, member, before, after):
        if before.channel is None and after.channel is not None:
            guild = after.channel.guild
            text_channel = discord.utils.get(guild.text_channels, name="text-channel-name")
            if text_channel:
                audio_source = MyAudioReceiver(self, text_channel)
                voice_client = await after.channel.connect()
                voice_client.play(audio_source)

client = VoiceToTextBot()
client.run(TOKEN)
