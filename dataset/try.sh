content_name=PT
audio_br=10
audio_name_encoded=$(ls originals/wav2lip_inputs/"${content_name}_audio_sr16000_br${audio_br}"*)
echo "${audio_name_encoded}"
