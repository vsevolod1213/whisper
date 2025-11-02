from faster_whisper import WhisperModel
from io import BytesIO

#  "small", "medium", "large-v3"
model_size = "medium"
model = WhisperModel(model_size, device="auto")

#files_dir = "whisper/files/"
def transcription(bio: BytesIO):

    bio.seek(0)
    segments, info = model.transcribe(bio, 
    task="transcribe",
    language=None,                   
    condition_on_previous_text=False,#
    beam_size=5,
    vad_filter=True)
    text = "\n".join(segment.text for segment in segments)   

    return text

    #print(f"Detected language: {info.language} ({info.language_probability:.2f})")

    #for segment in segments:
      #  print(f"[{segment.start:.2f}s → {segment.end:.2f}s] {segment.text}")