# Script to generate dataset in the format as specified by SUREAL:
# https://github.com/Netflix/sureal
# returns json as required starting from pairwise dataset collected in the study

import json
import numpy as np
import pandas as pd
from pprint import pprint

# Data files and test properties
data_file = 'Video Quality Survey5_June 18, 2021_07.00.csv'
comp_pairs_file = 'Pair_ID.csv'

contents = ['AM', 'MS', 'PP', 'PT', 'SC', 'YL']
num_avc_comps = 8
props_avc = ['26_2', '28_2', '30_2', '32_4']  # crf_ds
num_av1_comps = 6
props_av1 = ['60_2', '63_1', '63_2']

num_contents = len(contents)
# for each of the AVC and AV1 we compare it with either (original audio, resemble audio) + Wav2Lip Video;
# we also do 3 sanity checks
# each participant is shown 'num_comparison_per_content' comparison videos corresponding to
# one the 'num_contents' subjects
num_comparison_per_content = (num_av1_comps + num_av1_comps) * 2 + 3
num_comps = num_contents * num_comparison_per_content  # 186 different comparisons in study
results_file = 'dataset_SUREAL.py'

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

# Generate JSON as required by SUREAL dataset files
dataset_SUREAL = {
    'ref_videos': list(),
    'dis_videos': list()
}

# add ref videos to json
# 2 per content, one for original audio and another for resemble audio
# For now skips 2 of the sanity comparison per content involving just the encoded videos
for content_id, content in enumerate(contents):
    ref_dict = {
        'content_id': content_id * 2,
        'content_name': f'{content}_originalAudio',
        'path': f'{content}_driving_video_AVC_crf20_original_audio_br10.mp4'
    }
    dataset_SUREAL['ref_videos'].append(ref_dict)

    ref_dict = {
        'content_id': content_id * 2 + 1,
        'content_name': f'{content}_resembleAudio',
        'path': f'{content}_driving_video_AVC_crf20_resemble_audio.mp4'
    }
    dataset_SUREAL['ref_videos'].append(ref_dict)

# also get content name to content id dict for reference videos
ref_content_idx = dict()
for i, ref in enumerate(dataset_SUREAL['ref_videos']):
    ref_content_idx[ref['path']] = ref['content_id']

# Add distortion videos to json based on collected data
starting_comp, end_comp = 0, num_comps
# # Keep dis_video asset_id
# dis_asset_id_per_ref = {}
# dis_asset_id_to_content = {}
asset_id_prev = None
dis_dict = [None] * (num_contents * 2)  # 2 videos per content belonging to resemble audio and original audio
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
    video_A_idx = all_vids_idx[video_A]
    video_B_idx = all_vids_idx[video_B]
    # Content ID (ref Video ID) of Video A.
    # Content IDs are only resemble audio or original audio, per different person's content.
    # Don't compare sanity checks where the video A is neither resemble audio or original audio. E.g. where only
    # video or audio changes are compared.
    if video_A in ref_content_idx.keys():
        content_id = ref_content_idx[video_A]
    else:
        continue

    # # For this content, keep adding asset_IDs
    # if content_id not in dis_asset_id_per_ref.keys():
    #     dis_asset_id_per_ref[content_id] = 0
    #     dis_asset_id_to_content[content_id] = []
    # else:
    #     dis_asset_id_per_ref[content_id] += 1
    # dis_asset_id_to_content[content_id].append(video_B)

    # Generated distorted video dict
    if asset_id_prev != video_A_idx:
        dis_dict[content_id] = {
            'content_id': content_id,
            'asset_id': video_A_idx,
            'path': video_A,
            'os': dict()
        }

    # Generate data per subject
    for k in range(total_subjects):
        curr_subj = f'subj_{k}'
        # See if the score for this comparison exists for this subject
        if values[k] != values[k]:
            continue
        if values[k] == video_A:
            dis_dict[content_id]['os'][(curr_subj, video_B_idx)] = 1
        elif values[k] == video_B:
            continue
        else:
            raise ValueError(f'Data not in the expected format.')

    asset_id_prev = video_A_idx

dataset_SUREAL['dis_videos'] = dis_dict

# Write dataset file
# with open(results_file, 'w') as outfile:
#     json.dump(dataset_SUREAL, outfile, indent=4)
with open(results_file, 'w+') as outfile:
    pprint(dataset_SUREAL, stream=outfile)
