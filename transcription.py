from faster_whisper import WhisperModel
from io import BytesIO
import subprocess, tempfile, os


#  "small", "medium", "large-v3"
model_size = "medium"
model = WhisperModel(model_size, device="auto")

files_dir = "whisper/files/"

def which_file(source: BytesIO | str, media_type: str):
  if media_type in ("video", "video_note"):
    return extract_audio(source)
  else:
    return transcription(source)

def extract_audio(source: BytesIO | str):
  fd, temp_audio = tempfile.mkstemp(suffix=".wav")
  os.close(fd)
  try:  
    if isinstance(source, BytesIO):
      fd_in, temp_video = tempfile.mkstemp(suffix=".mp4")
      os.close(fd_in)
      with open(temp_video, "wb") as f:
          f.write(source.read())

      subprocess.run([
          "ffmpeg", "-y", "-i", temp_video,
          "-vn", "-ac", "1", "-ar", "16000",
          "-f", "wav", temp_audio
      ], check=True, stderr=subprocess.DEVNULL)

      os.remove(temp_video)
      return transcription(temp_audio)

    else:
      subprocess.run([
              "ffmpeg", "-y", "-i", source,
              "-vn", "-ac", "1", "-ar", "16000",
              "-f", "wav", temp_audio
          ], check=True, stderr=subprocess.DEVNULL)
      return transcription(temp_audio)
  finally:
    if os.path.exists(temp_audio):
      os.remove(temp_audio)

    
def transcription(source: BytesIO | str):

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
  text = " ".join(segment.text for segment in segments)   

  return text
