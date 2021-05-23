# Generates wav2lip input video/frame

# old where driving video was generated through original video
#name='AVC_AAC_10'
#inp_vid="content1/PT_${name}.mp4"
#out_name="content1/PT_wav2lip_driving_${name}"
#
## 5s video clip
#ffmpeg -y -i $inp_vid -t 5 -c copy "${out_name}_video.mp4"
#
## First frame
#ffmpeg -y -ss 1 -i $inp_vid -vf "select=eq(n\,0)" -vframes 1 "${out_name}_frame.png"

inp_vid="originals/wav2lip_inputs/PT_driving_video_recorded.mov"
crf=30
out_vid="originals/wav2lip_inputs/PT_driving_video_recorded_AVC_crf${crf}.mp4"
# new where driving video .mov file is available
ffmpeg -y -i "${inp_vid}" -c:v libx264 -crf "${crf}" -vf "fps=25,scale=1280x720,format=yuv420p" -an "${out_vid}"
