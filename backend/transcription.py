# backend/transcription.py
from faster_whisper import WhisperModel
from io import BytesIO
import subprocess
import tempfile
import os

model_size = "small"  # "small"/"medium"/"large-v3"

model = WhisperModel("small", device="cpu", compute_type="float32", cpu_threads=3, num_workers=1)

files_dir = "/root/filety/backend/files/"
os.makedirs(files_dir, exist_ok=True)

MAX_SIZE_IN_MEMORY = 5 * 1024 * 1024


class TranscriptionError(Exception):
    def __init__(self, message: str, cleanup: list[str] | None = None):
        super().__init__(message)
        self.cleanup = cleanup or []


def which_file(source, media_type: str):
    cleanup: list[str] = []
    try:
        if media_type.startswith("video"):
            text, extra = extract_audio(source)
        else:
            text, extra = transcription(source)
        cleanup.extend(extra)
        return text, cleanup
    except TranscriptionError as exc:
        exc.cleanup.extend(cleanup)
        raise
    except Exception as exc:
        raise TranscriptionError(str(exc), cleanup) from exc


def extract_audio(source):
    cleanup: list[str] = []
    try:
        fd, temp_audio = tempfile.mkstemp(suffix=".wav", dir=files_dir)
        os.close(fd)
        cleanup.append(temp_audio)

        if isinstance(source, BytesIO):
            fd_in, temp_video = tempfile.mkstemp(suffix=".mp4", dir=files_dir)
            os.close(fd_in)
            cleanup.append(temp_video)

            with open(temp_video, "wb") as f:
                f.write(source.read())

            subprocess.run(
                ["ffmpeg", "-y", "-i", temp_video, "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", temp_audio],
                check=True,
                stderr=subprocess.DEVNULL,
            )
        else:
            subprocess.run(
                ["ffmpeg", "-y", "-i", source, "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", temp_audio],
                check=True,
                stderr=subprocess.DEVNULL,
            )

        wav_size = os.path.getsize(temp_audio)

        if wav_size <= MAX_SIZE_IN_MEMORY:
            with open(temp_audio, "rb") as f:
                data = f.read()
            buffer = BytesIO(data)
            buffer.seek(0)
            text, extra = transcription(buffer)
        else:
            text, extra = transcription(temp_audio)

        cleanup.extend(extra)
        return text, cleanup
    except TranscriptionError as exc:
        exc.cleanup.extend(cleanup)
        raise
    except Exception as exc:
        raise TranscriptionError(str(exc), cleanup) from exc


def transcription(source):
    cleanup: list[str] = []
    if isinstance(source, str):
        cleanup.append(source)

    try:
        if isinstance(source, BytesIO):
            source.seek(0)

        segments, info = model.transcribe(
            source,
            task="transcribe",
            language=None,
            condition_on_previous_text=False,
            beam_size=5,
            vad_filter=True,
        )

        text = " ".join(s.text for s in segments)
        return text, cleanup
    except Exception as exc:
        raise TranscriptionError(str(exc), cleanup) from exc
