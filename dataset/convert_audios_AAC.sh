# Script which converts original audio to various qualities
# for experiment with audio qualities.
# Qualities is determined by Sampling Rate SR and compression params specified by VBR or constrained BR (bitrate).

# Assumes input audio is AAC encoded! Ensure this.
# params
contents="PP" #AM MS PP PT SC YL"
srs="8000 16000"
brs="1 5 8 10 12 16 20"
#audio_name='content1/PT_original_audio.m4a'
#output_file='content1/PT_original_audio_AAC'

audio_path='originals/audios/'
results_path='originals/wav2lip_inputs/'

# vbr can be 1 2 3 4 5; higher is higher quality
# br specifies max bit rate in kbps
# use either of them -- both doesnt work

for content in $contents
do
  for sr in $srs
  do
    audio_name="${audio_path}${content}_original_audio.m4a"
    sr_name="${audio_path}${content}_audio_sr${sr}.m4a"

    # Get file with appropraite SR
    ffmpeg -y -i "${audio_name}" -ar "${sr}" "${sr_name}"

    #for vbr in 1;
    for br in $brs #0.5 1 2 3 4 #5 10 20 30
    do
        output_file="${results_path}${content}_audio_sr${sr}_br${br}.m4a"

        # convert file to appropriate compression level
        # # ffmpeg -y -i ${audio_name} -c:a libfdk_aac -vbr $vbr "${output_file}_vbr${vbr}.m4a"
        ffmpeg -y -i "${sr_name}" -c:a libfdk_aac -b:a "${br}k" "${output_file}"

        # Find actual bitrate
        audio_br=$(mediainfo --Output='Audio;%BitRate%' "${output_file}")
        output_file_final="${results_path}${content}_audio_sr${sr}_br${br}_bitrateA_${audio_br}.m4a"
        mv "${output_file}" "${output_file_final}"
    done
  done
done
