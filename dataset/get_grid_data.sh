# Script which converts original video to grid data for experiments.
# Video codec option AV1 or AVC, Audio codec options AAC
# Generates both of them at various qualities as specified.
# Assumes a video file and an audio file for original video

# Converts video fps = 25, resolution = 720p if not.
# Video quality is established based on crf.
# Ensure audio sr = 16k, channel = 1 -- needed as wav2lip will work with these audio params.
# Audio quality is ensured based on specified bitrate constraints.
# Note that: in bitrate constraints, codec will hit a floor and wont be able to go below a bitrate.

# Works in three steps:
# Step 1: encode video to appropriate format, ensuring resolution and crf
# Step 2: encode audio to appropriate format, ensuring bitrate argument
# Step 3: merge video and audio

# params
# pass from the terminal
# argument 1: name of content
#             e.g. PT
# argument 2: video codec type
#             AV1 or AVC
# argument 3: video quality crf
#             int in 0-63. higher crf lower quality
# argument 4: audio codec bitrate quality
#             target br in kbps

# Example command:
# bash get_grid_data.sh PT AVC 60 1

# params
content_name=${1}
if [ "${2}" = "AV1" ]
then
  video_codec_name="AV1"
  video_codec="libaom-av1"
elif [ "${2}" = "AVC" ]
then
  video_codec_name="AVC"
  video_codec="libx264"
else
  echo "Wrong video codec. Specify AV1 or AVC"
  exit
fi
audio_codec_name="AAC"
audio_codec="libfdk_aac" # codec for aac
crf=${3}
audio_br=${4}

video_name="originals/videos/${1}_original.mov"
audio_name="originals/audios/${1}_original_audio.m4a"
output_path="prelim_expt/benchmark_set/${1}/"
output_name_video="${video_codec_name}_crf${crf}" # save as mp4
output_name_audio="${audio_codec_name}_br${audio_br}" # save as m4a
output_file="${output_path}${output_name_video}_${output_name_audio}.mp4"
# mkdir if it doesnt exist
mkdir -p "${output_path}"

# Step 1: Encode video
tmp_video_file="${output_path}tmpvideo_${output_name_video}_${output_name_audio}.mp4"
ffmpeg -y -i "${video_name}" -c:v ${video_codec} -crf "${crf}" -vf "fps=25,scale=1280x720,format=yuv420p" -an "${tmp_video_file}"
# Only for AVC videos being encoded at low quality, also add the changing resolution for bitrate reduction
# ds by 2 (calculate bitrate here), then encoding, then upsampling (present this video)
if [ "${video_codec_name}" = "AVC" ]
then
  ds_vid="${output_path}${output_name_video}_${output_name_audio}_ds2"
  us_vid="${output_path}${output_name_video}_${output_name_audio}_ds2_us2"
  ffmpeg -y -i "${video_name}" -c:v ${video_codec} -crf "${crf}" -vf "fps=25,scale=640x360,format=yuv420p" -an "${ds_vid}"
  ffmpeg -y -i "${ds_vid}" -vf "fps=25,scale=640x360,format=yuv420p" -an "${us_vid}"
fi

# Step 2: Encode audio
tmp_audio_file="${output_path}tmpaudio_${output_name_video}_${output_name_audio}.m4a"
ffmpeg -y -i "${audio_name}" -c:a ${audio_codec} -b:a "${audio_br}k" "${tmp_audio_file}"

# Step 3: Merge video and audio
ffmpeg -y -i "${tmp_video_file}" -i "${tmp_audio_file}" -c copy "${output_file}"
if [ "${video_codec_name}" = "AVC" ]
then
  ffmpeg -y -i "${us_vid}" -i "${tmp_audio_file}" -c copy \
        "${output_path}${output_name_video}_${output_name_audio}_ds2_us2.mp4"
fi

# delete tmp files
rm "${tmp_video_file}"
rm "${tmp_audio_file}"
