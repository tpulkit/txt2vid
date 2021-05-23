# Generates wav2lip input video/frame

name='AVC_AAC_10'
inp_vid="content1/PT_${name}.mp4"
out_name="content1/PT_wav2lip_driving_${name}"

# 5s video clip
ffmpeg -y -i $inp_vid -t 5 -c copy "${out_name}_video.mp4"

# First frame
ffmpeg -y -ss 1 -i $inp_vid -vf "select=eq(n\,0)" -vframes 1 "${out_name}_frame.png"
