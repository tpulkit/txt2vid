# Script which converts videos to AV1 and merges audio.
# Assumes a video file and an audio file for original video

# Converts  video fps = 25, resolution = 720p if not
# Ensure audio sr = 16k, channel = 1 -- needed as wav2lip will work with these audio params

# params
video_name='content1/PT_original.mov'
audio_name='content1/PT_original_audio.m4a'
output_name='content1/PT_AV1_AAC'

# crfs are in range 0 to 63 with 63 being worst quality and 0 being highest

# putting a bitrate (br) constrains br directly. br in kbps

#for crf in 63;

crf=63
for br in 10
do
#    # Extract video
#    ffmpeg -y -i $video_name -c:v libaom-av1 -crf $crf -vf scale=1280x720 -filter:v fps=25 -an "content1/tmp_${crf}.mp4"
#
#    # Merge video and audio
#    ffmpeg -y -i "content1/tmp_${crf}.mp4" -i $audio_name -c copy "${output_name}_${crf}crf.mp4"
#
#    rm "content1/tmp_${crf}.mp4"

    # Extract video
    ffmpeg -y -i $video_name -c:v libaom-av1 -b:v "${br}k" -crf $crf -vf scale=1280x720 -filter:v fps=25 -an "content1/tmp_${crf}_${br}.mp4"

    # Merge video and audio
    ffmpeg -y -i "content1/tmp_${crf}_${br}.mp4" -i $audio_name -c copy "${output_name}_${crf}crf_${br}br.mp4"

    rm "content1/tmp_${crf}_${br}.mp4"
done
