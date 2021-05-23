# Script which converts videos to AVC and merges audio.
# Assumes a video file and an audio file for original video

# Converts  video fps = 25, resolution = 720p if not
# Ensure audio sr = 16k, channel = 1 -- needed as wav2lip will work with these audio params

# params
video_name='content1/PT_original.mov'
audio_name='content1/PT_original_audio.m4a'
output_name='content1/PT_AVC_AAC'

for crf in 10 20 30 40 50;
do
    # Extract video
    ffmpeg -y -i $video_name -c:v libx264 -crf $crf -vf scale=1280x720 -filter:v fps=25 -an content1/tmp.mp4

    # Merge video and audio
    ffmpeg -y -i content1/tmp.mp4 -i $audio_name -c copy "${output_name}_${crf}crf.mp4"

    rm content1/tmp.mp4
done
