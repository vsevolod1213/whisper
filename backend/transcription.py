from faster_whisper import WhisperModel
from io import BytesIO
import subprocess
import tempfile
import os

model_size = "medium"
model = WhisperModel(model_size, device="cpu")

files_dir = "/root/filety/backend/files/"
os.makedirs(files_dir, exist_ok=True)

MAX_SIZE_IN_MEMORY = 5 * 1024 * 1024

def which_file(source, media_type: str):
    if media_type.startswith("video"):
        return extract_audio(source)
    else:
        return transcription(source)

def extract_audio(source):
    temp_files = []

    fd, temp_audio = tempfile.mkstemp(suffix=".wav", dir=files_dir)
    os.close(fd)
    temp_files.append(temp_audio)

    try:
        if isinstance(source, BytesIO):
            fd_in, temp_video = tempfile.mkstemp(suffix=".mp4", dir=files_dir)
            os.close(fd_in)
            temp_files.append(temp_video)

            with open(temp_video, "wb") as f:
                f.write(source.read())

            subprocess.run([
                "ffmpeg", "-y", "-i", temp_video,
                "-vn", "-ac", "1", "-ar", "16000",
                "-f", "wav", temp_audio
            ], check=True, stderr=subprocess.DEVNULL)

        else:
            subprocess.run([
                "ffmpeg", "-y", "-i", source,
                "-vn", "-ac", "1", "-ar", "16000",
                "-f", "wav", temp_audio
            ], check=True, stderr=subprocess.DEVNULL)

        wav_size = os.path.getsize(temp_audio)

        if wav_size <= MAX_SIZE_IN_MEMORY:
            with open(temp_audio, "rb") as f:
                data = f.read()
            buffer = BytesIO(data)
            buffer.seek(0)
            return transcription(buffer)
        else:
            return transcription(temp_audio)

    finally:
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass

def transcription(source):
    is_path = isinstance(source, str)
    temp_list = [source] if is_path else []

    try:
        if isinstance(source, BytesIO):
            source.seek(0)

        segments, info = model.transcribe(
            source,
            task="transcribe",
            language=None,
            condition_on_previous_text=False,
            beam_size=5,
            vad_filter=True
        )

        text = " ".join(s.text for s in segments)
        return text

    finally:
        if is_path:
            try:
                if os.path.exists(source):
                    os.remove(source)
            except:
                pass
