# Script to generate dataset in the format as specified by SUREAL:
# https://github.com/Netflix/sureal
# returns json as required starting from pairwise dataset collected in the study

import json
import numpy as np
import pandas as pd
from pprint import pprint
import os

# Data files and test properties
data_file = 'Video Quality Survey5_June 18, 2021_07.00.csv'
comp_pairs_file = 'Pair_ID.csv'

contents = ['AM', 'MS', 'PP', 'PT', 'SC', 'YL']
num_avc_comps = 8 # 4 video CRFs * 2 audio BRs
props_avc = ['26_2', '28_2', '30_2', '32_4']  # crf_ds
num_av1_comps = 6 # 3 video CRFs * 2 audio BRs
props_av1 = ['60_2', '63_1', '63_2']

num_contents = len(contents)
# for each of the AVC and AV1 we compare it with either (original audio, resemble audio) + Wav2Lip Video;
# we also do 3 sanity checks
# each participant is shown 'num_comparison_per_content' comparison videos corresponding to
# one the 'num_contents' subjects
num_nonsantiy_comparison_per_content = (num_avc_comps + num_av1_comps) * 2
num_sanity_comparison_per_content = 3
num_comparison_per_content = num_nonsantiy_comparison_per_content + num_sanity_comparison_per_content
num_comps = num_contents * num_comparison_per_content  # 186 different comparisons in study
num_nonsanity_comps = num_contents * num_nonsantiy_comparison_per_content # 168 different actual comparisons

num_videos_per_content = (num_av1_comps + num_avc_comps + 2) # 16 different videos per content

results_dir = 'datasets_SUREAL'

# Read data
df_data = pd.read_csv(data_file)
num_rows = len(df_data.index)
# -2 because 2 rows of metadata
total_subjects = num_rows - 2
# print(num_rows, total_subjects)

df_pairs = pd.read_csv(comp_pairs_file)
# Get all Video IDs, and make a dict from video ID to idx
all_vids = np.union1d(pd.unique(df_pairs['video_A']), pd.unique(df_pairs['video_B']))
all_vids_idx = dict()
for i, vid in enumerate(all_vids):
    all_vids_idx[vid] = i
num_total_vids = len(all_vids)

# Generate dataset as required by SUREAL dataset files
dataset_SUREAL = {
    'ref_videos': list(),
    'dis_videos': list()
}

# add ref videos to json: 1 corresponding to each content
for content_id, content in enumerate(contents):
    ref_dict = {
        'content_id': content_id + 1, # start indexing content from 1 instead of 0
        'content_name': f'{content}',
    }
    dataset_SUREAL['ref_videos'].append(ref_dict)

# also get content name to content id dict for reference videos
ref_content_idx = dict()
for i, ref in enumerate(dataset_SUREAL['ref_videos']):
    ref_content_idx[ref['content_name']] = ref['content_id']

# Add distortion videos to json based on collected data
starting_comp, end_comp = 0, num_comps

# 2 because we compare resemble from text and resemble from audio
dis_dict = [None] * num_videos_per_content
# dis_dict = [None] * num_total_vids

prev_content_id = 1
for i in range(starting_comp, end_comp):
    # comparison ID
    curr_comp = f"vid_{i}"
    # extract user data for this comparison
    ser = pd.Series(df_data[curr_comp]).head(num_rows)
    values = ser[2:2 + num_rows].values

    # Compared Videos and their IDs
    video_A = df_pairs.loc[(df_pairs["Global_ID"] == curr_comp)]['video_A'].values[0]
    video_B = df_pairs.loc[(df_pairs["Global_ID"] == curr_comp)]['video_B'].values[0]
    # asset IDs are basically video-IDs
    video_A_idx = all_vids_idx[video_A] % num_videos_per_content
    video_B_idx = all_vids_idx[video_B] % num_videos_per_content

    content_id = ref_content_idx[video_A.split('_')[0]]

    # # For now just generate for 1 content to debug analysis
    # if content_id != 0:
    #     continue

    # Write dataset file if content changed
    if prev_content_id != content_id:
        dataset_SUREAL['dis_videos'] = dis_dict

        results_file = os.path.join(results_dir, f'Content{prev_content_id}.py')
        with open(results_file, 'w+') as outfile:
            outfile.write('dataset_name = \"Txt2Vid Subjective Study\"\n')
            outfile.write('ref_score = 0\n')
            outfile.write('\nref_videos = ')
            pprint(dataset_SUREAL['ref_videos'], stream=outfile)
            outfile.write('\ndis_videos = ')
            pprint(dataset_SUREAL['dis_videos'], stream=outfile)

        prev_content_id = content_id
        dis_dict = [None] * num_videos_per_content
        # dis_dict = [None] * num_total_vids

    # skip sanity check comparisons. only one of video_A and video_B should be driving_video,
    # i.e., obtained from either original audio or resemble audio
    video_A_driving = (video_A.split('_')[1] == 'driving')
    video_B_driving = (video_B.split('_')[1] == 'driving')
    if not(video_A_driving ^ video_B_driving):
        continue

    # Generate distorted video dict if it didn't exist already
    if not dis_dict[video_A_idx]:
        dis_dict[video_A_idx] = {
            'content_id': content_id,
            'asset_id': video_A_idx,
            'path': video_A,
            'os': dict()
        }

    # If the compared video is not one of Wav2Lip generated (resemble or original audio) then
    # add a proxy element in the dataset comparison list.
    # Currently ignoring sanity checks before, so OK to just make a new one if video_B didn't exist before
    if not dis_dict[video_B_idx]:
        dis_dict[video_B_idx] = {
            'content_id': content_id,
            'asset_id': video_B_idx,
            'path': video_B,
            'os': dict()
        }

    # Generate data per subject
    for k in range(total_subjects):
        curr_subj = f'subj_{k}'
        # See if the score for this comparison exists for this subject
        if values[k] != values[k]:
            continue
        if values[k] == video_A:
            dis_dict[video_A_idx]['os'][(curr_subj, video_B_idx)] = 1
        elif values[k] == video_B:
            dis_dict[video_B_idx]['os'][(curr_subj, video_A_idx)] = 1
        else:
            raise ValueError(f'Data not in the expected format.')

# Write content for last content
dataset_SUREAL['dis_videos'] = dis_dict
results_file = os.path.join(results_dir, f'Content{content_id}.py')
with open(results_file, 'w+') as outfile:
    outfile.write('dataset_name = \"Txt2Vid Subjective Study\"\n')
    outfile.write('ref_score = 0\n')
    outfile.write('\nref_videos = ')
    pprint(dataset_SUREAL['ref_videos'], stream=outfile)
    outfile.write('\ndis_videos = ')
    pprint(dataset_SUREAL['dis_videos'], stream=outfile)


