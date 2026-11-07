# Synthetic media fixtures

0.15 seconds of silence (16 kHz mono), encoded with FFmpeg for upload validation.
`video.mp4` and `video.wmv` add a black 32×32 frame for negative audio-only tests.
These are test data only, not recordings or content for any environment.

Audio encoders: libmp3lame, aac, pcm_s16le, wmav2, aac (M4A), libopus (Ogg), flac.
Video encoders: mpeg4 (MP4), msmpeg4 (ASF/WMV).
