import asyncio
from aiogram import Bot, Dispatcher, types, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import Message
from dotenv import load_dotenv
from aiogram.handlers import MessageHandler
import sys
import os
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
from backend.transcription import transcription, which_file
from io import BytesIO
from html import escape

load_dotenv()

TOKEN = os.getenv("api_token")
bot = Bot(token=TOKEN, default_bot_properties=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp= Dispatcher()

max_memory = 20
files_dir = Path("files")
files_dir.mkdir(parents = True, exist_ok = True)

MAX_TG_SIMVOLS = 4096
WRAP_PREFIX = "<blockquote>"
WRAP_SUFFIX = "</blockquote>"
CHUNK_SIZE = MAX_TG_SIMVOLS - len(WRAP_PREFIX) - len(WRAP_SUFFIX) - 100

def split_text(text: str, chunk_size: int = CHUNK_SIZE) -> list[str]:
    chunks: list[str] = []
    while text:
        if len(text) <= chunk_size:
            chunks.append(text)
            break
        split_index = text.rfind('\n', 0, chunk_size)
        if split_index == -1:
            split_index = text.rfind(' ', 0, chunk_size)
        if split_index == -1:
            split_index = chunk_size
        chunks.append(text[:split_index])
        text = text[split_index:].lstrip()
    return chunks

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
        
        doc = message.document

        mime = doc.mime_type if (doc and doc.mime_type) else None
        filename = doc.file_name if (doc and doc.file_name) else None
        ext = Path(filename).suffix.lower() if filename else None

        video_ext = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
        audio_ext = {".mp3", ".wav", ".ogg", ".m4a", ".flac"}

        is_video = (
            message.video
            or message.video_note
            or (mime and mime.startswith("video/"))
            or (ext in video_ext)
        )

        is_audio = (
            message.audio
            or message.voice
            or (mime and mime.startswith("audio/"))
            or (ext in audio_ext)
        )

        if is_video:
            status = await message.answer("Получил видео, делаю транскрибацию...")
        elif is_audio:
            status = await message.answer("Получил аудио, начинаю расшифровку...")
        else:
            status = await message.answer("Не удалось получить файл. Попробуйте еще раз.")
            return
        
        await self.go_to_transcription(message, status, file_obj)

    async def keep_aditing(self, status_msg: Message, stop_event: asyncio.Event):
        dots = 0
        while not stop_event.is_set():
            dots = (dots + 1)% 4
            try:
                await status_msg.edit_text("Обрабатываю" + "." * dots)
            except:
                pass
            await asyncio.sleep(1)

    async def go_to_transcription(self, message: Message, status_msg: Message, file_obj):
        bio = BytesIO()
        file_size_mb = (file_obj.file_size or 0)/1024/1024

        try:
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
            
            stop_event = asyncio.Event()

        except:
            await status_msg.edit_text("Ошибка. Файл слишком большой.")
            return
        try:
            editing_task = asyncio.create_task(self.keep_aditing(status_msg, stop_event))
        except:
            editing_task = None
            await status_msg.edit_text("Ошибка при обработке файла. Попробуйте еще раз.")
            return

        try:
            text, cleanup = await asyncio.to_thread(which_file, source, media_type=message.content_type)
            stop_event.set()
            editing_task.cancel()
            try:
                await editing_task
            except:
                pass
            
            save_text = escape(text)
            parts = split_text(save_text, chunk_size=CHUNK_SIZE)
            if not parts:
                await status_msg.edit_text(f"Ничего не услышал")
                return
            await status_msg.edit_text(f"{WRAP_PREFIX}{parts[0]}{WRAP_SUFFIX}", parse_mode="HTML")

            for part in parts[1:]:
                await message.answer(f"{WRAP_PREFIX}{part}{WRAP_SUFFIX}", parse_mode="HTML")

            for f in cleanup:
                try:
                    if os.path.exists(f):
                        os.remove(f)
                except:
                    pass
            await message.answer("Готово!")
        except Exception as e:
            stop_event.set()
            editing_task.cancel()
            try:
                await editing_task
            except:
                pass

            await status_msg.edit_text(f"Ничего не услышал")
        finally:
            if isinstance(source, (str, Path)) and Path(source).exists():
                Path(source).unlink()


async def main():
    me = await bot.get_me()
    print(f"Бот запущен: @{me.username} (id: {me.id})")
    await dp.start_polling(bot)
if __name__ == "__main__":
    asyncio.run(main())