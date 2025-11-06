import asyncio
from aiogram import Bot, Dispatcher, types, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import Message
import os
from dotenv import load_dotenv
from aiogram.handlers import MessageHandler
from backend.transcription import transcription, which_file
from pathlib import Path
from io import BytesIO

load_dotenv()

TOKEN = os.getenv("api_token")
bot = Bot(token=TOKEN, default_bot_properties=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp= Dispatcher()

max_memory = 20
files_dir = Path("files")
files_dir.mkdir(parents = True, exist_ok = True)

@dp.message(CommandStart())
async def send_welcome(message: Message):
    await message.answer(
        "Привет! Расшифрую что хочешь.\nПрисылай <b>аудио | видео</b>...", parse_mode="HTML"
    )

@dp.message(F.document | F.audio | F.voice | F.video | F.video_note)
class TranscribeHandler(MessageHandler):
    async def handle(self):
        message = self.event
  
        file_obj = message.document or message.audio or message.voice or message.video or message.video_note
        
        if file_obj == message.video or message.video_note:
            status = await message.answer("Получил видео, делаю транскрипцию...")

        elif file_obj == message.document or message.audio or message.voice:
            status = await message.answer("Получил аудио, начинаю расшифровку...")
            
        else:
            status = await message.answer("Не удалось получить файл. Попробуйте еще раз.")
            return
        
        await self.go_to_transcription(message, status, file_obj)
        
    async def go_to_transcription(self, message: Message, status_msg: Message, file_obj):
        bio = BytesIO()
        file_size_mb = (file_obj.file_size or 0)/1024/1024

        if file_size_mb <= max_memory:
            file_id = getattr(file_obj, "file_id", None)
            if not file_id:
                await status_msg.edit_text("Не удалось получить идентификатор файла. Попробуйте еще раз.")
                return
            await bot.download(file_obj, destination=bio)
            bio.seek(0)
            source = bio
        else:
            original_name = getattr(file_obj, "file_name", None)
            ext = Path(original_name).suffix if original_name else ".bin"
            temp_path = files_dir / f"{file_obj.file_unique_id}{ext}"
            await bot.download(file_obj, destination=temp_path)
            source = temp_path
        
        try:
            text = await asyncio.to_thread(which_file, source, media_type=message.content_type)
            await status_msg.edit_text(f"<blockquote>{text}</blockquote>",parse_mode="HTML")
        except Exception as e:
             await status_msg.edit_text(f"Ничего не услышал")
        finally:
            if isinstance(source, str) and Path(source).exists():
                Path(source).unlink()

async def main():
    me = await bot.get_me()
    print(f"Бот запущен: @{me.username} (id: {me.id})")
    await dp.start_polling(bot)
if __name__ == "__main__":
    asyncio.run(main())