# generates expt_run.txt file to be allow running multiple encode processes in parallel.
# example command (jobs determine concurrent commands to run):
# parallel < expt_run.txt or  parallel  --jobs 2 < expt_run.txt

# get_grid_data params for help
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
content_names="PT SC YL PP AM MS"
video_codec="AV1" # AV1 or AVC
output_file="expt_run_AV1.txt"
crfs="63 60" #"63 60" #"26 28 30 32"
brs="5 10"
for content_name in $content_names
  do
  for crf in $crfs #60 50 40 30 20 10 #63 60 55 50 45 40
  do
    for audio_br in $brs #1 5 10 20 30 50
    do
        echo "bash get_grid_data.sh ${content_name} ${video_codec} ${crf} ${audio_br}" >> ${output_file}
    done
  done
done