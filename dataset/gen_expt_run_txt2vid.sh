# generates expt_run.txt file to be allow running multiple txt2vid file processes in parallel.
# example command (jobs determine concurrent commands to run):
# parallel < expt_run.txt or  parallel  --jobs 2 < expt_run.txt

# get_txt2vid_data params for help
# params
# pass from the terminal
# argument 1: name of content
#             e.g. PT
# argument 2: resemble user name -- check resemble_config.json

# Example command:
# bash get_txt2vid_data.sh PT "Pulkit Tandon"
content_names=("PT" "SC" "PP" "AM" "YL" "MS")
resemble_user_names=("Pulkit" "Shubham" "Pat" "Anesu" "Yimeng" "Misha")
output_file="expt_run_txt2vid.txt"

for i in $(seq 0 5)
do
  echo "bash get_txt2vid_data.sh ${content_names[i]} ${resemble_user_names[i]}" >> ${output_file}
done