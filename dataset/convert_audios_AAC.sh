# Script which converts original audio to various qulities 
# for experiment with audio qualities

# Assumes input audio is AAC encoded! Ensure this.
# params
audio_name='content1/PT_original_audio.m4a'
output_file='content1/PT_original_audio_AAC'

# vbr can be 1 2 3 4 5
# higher is higher quality

# br specifies max bit rate in kbps 

# use either of them -- both doesnt work

#for vbr in 1;
for br in 0.5 1 2 3 4 #5 10 20 30
do
#    ffmpeg -y -i ${audio_name} -c:a libfdk_aac -vbr $vbr "${output_file}_vbr${vbr}.m4a" 
    ffmpeg -y -i ${audio_name} -c:a libfdk_aac -b:a "${br}k" "${output_file}_br${br}.m4a" 
done
