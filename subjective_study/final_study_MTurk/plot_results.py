# plots results from a csv file containing comparisons and counts

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib

# Result file
import pdb

result_file = 'results.csv'

df_data = pd.read_csv(result_file)
num_comps = len(df_data.index)
print('Num of comparisons: ', num_comps)

# Get compression numbers for txt2vid approach
# in Bps (bytes per sec)
# Taken from data on popeye2: /raid/tpulkit/txt2vid/dataset/originals

txt_br = {
    'AM': 79.20,
    'MS': 81.33,
    'PP': 92.27,
    'PT': 83.47,
    'SC': 82.67,
    'YL': 89.6
}
audio_br = {
    'AM': 10036,
    'MS': 10000,
    'PP': 10035,
    'PT': 10080,
    'SC': 10067,
    'YL': 10121
}


def vid_properties(vid):
    splits = vid.split('_')
    # print(splits)
    video_BR = np.nan
    audio_BR = np.nan
    video_crf = np.nan
    video_ds = np.nan

    content = splits[0]
    if splits[5] == 'resemble':
        codec = 'wav2lip_resemble'
    elif splits[5] == 'original':
        codec = 'wav2lip_orig'
    else:
        codec = splits[1]
        video_BR = int(splits[8])
        audio_BR = int(splits[10].split('.')[0])
        video_crf = (splits[2][3:])
        video_ds = (splits[5][2:])
    # print(content, codec, video_BR, audio_BR)
    return content, codec, video_BR, audio_BR, video_crf, video_ds


# Extract results

# store results of comparisons as br vs fraction of people preferring our approach
num_contents = 6
contents = ['AM', 'MS', 'PP', 'PT', 'SC', 'YL']
num_avc_comps = 8
props_avc = ['26_2', '28_2', '30_2', '32_4']  # crf_ds
num_av1_comps = 6
props_av1 = ['60_2', '63_1', '63_2']

# comparisons
# -1 => that case didn't happen
wav2lip_RSaudio_vs_avc = np.ones((num_avc_comps, num_contents, 2)) * -1
wav2lip_Origaudio_vs_avc = np.ones((num_avc_comps, num_contents, 2)) * -1
wav2lip_RSaudio_vs_av1 = np.ones((num_av1_comps, num_contents, 2)) * -1
wav2lip_Origaudio_vs_av1 = np.ones((num_av1_comps, num_contents, 2)) * -1

# Sanity checks
# fraction RSaudio is better than OrigAudio
wav2lip_RSaudio_vs_Origaudio = np.ones((num_contents)) * -1
# fraction better video quality was rated higher
avc_video_deg = np.ones((num_contents)) * -1
# fraction better audio quality was rated higher
avc_audio_deg = np.ones((num_contents)) * -1

num_subjects = np.zeros(num_comps)
num_valid_subjects = np.zeros(num_comps)

for i in range(num_comps):
    # print(f'On comparison: {i}')
    video_A = df_data.iloc[i]['video_A']
    video_B = df_data.iloc[i]['video_B']
    count_A = df_data.iloc[i]['count_A']
    count_B = df_data.iloc[i]['count_B']
    num_subjects[i] = df_data.iloc[i]['num_subjects']
    num_valid_subjects[i] = df_data.iloc[i]['valid_subjects']

    content_A, codec_A, video_BR_A, audio_BR_A, crf_A, ds_A = vid_properties(video_A)
    content_B, codec_B, video_BR_B, audio_BR_B, crf_B, ds_B = vid_properties(video_B)

    assert content_A == content_B, 'not same contents compared, something went wrong.'
    content_idx = contents.index(content_A)

    if (codec_A == 'wav2lip_resemble') and (codec_B == 'AVC' or codec_B == 'AV1'):
        if codec_B == 'AVC':
            video_idx = props_avc.index(f'{crf_B}_{ds_B}')
            audio_idx = 1 if audio_BR_B < 7500 else 0

            wav2lip_RSaudio_vs_avc[audio_idx * (num_avc_comps // 2) + video_idx, content_idx, 1] = \
                count_A / (count_A + count_B)
            wav2lip_RSaudio_vs_avc[audio_idx * (num_avc_comps // 2) + video_idx, content_idx, 0] = \
                (video_BR_B + audio_BR_B) / txt_br[content_A]

            # print(video_BR_B, audio_BR_B, txt_br[content_A])

        elif codec_B == 'AV1':
            video_idx = props_av1.index(f'{crf_B}_{ds_B}')
            audio_idx = 1 if audio_BR_B < 7500 else 0

            wav2lip_RSaudio_vs_av1[audio_idx * (num_av1_comps // 2) + video_idx, content_idx, 1] = \
                count_A / (count_A + count_B)
            wav2lip_RSaudio_vs_av1[audio_idx * (num_av1_comps // 2) + video_idx, content_idx, 0] = \
                (video_BR_B + audio_BR_B) / txt_br[content_A]

    elif (codec_A == 'wav2lip_orig') and (codec_B == 'AVC' or codec_B == 'AV1'):
        if codec_B == 'AVC':
            video_idx = props_avc.index(f'{crf_B}_{ds_B}')
            audio_idx = 1 if audio_BR_B < 7500 else 0

            wav2lip_Origaudio_vs_avc[audio_idx * (num_avc_comps // 2) + video_idx, content_idx, 1] = \
                count_A / (count_A + count_B)
            wav2lip_Origaudio_vs_avc[audio_idx * (num_avc_comps // 2) + video_idx, content_idx, 0] = \
                (video_BR_B + audio_BR_B) / audio_br[content_A]

        elif codec_B == 'AV1':
            video_idx = props_av1.index(f'{crf_B}_{ds_B}')
            audio_idx = 1 if audio_BR_B < 7500 else 0

            wav2lip_Origaudio_vs_av1[audio_idx * (num_av1_comps // 2) + video_idx, content_idx, 1] = \
                count_A / (count_A + count_B)
            wav2lip_Origaudio_vs_av1[audio_idx * (num_av1_comps // 2) + video_idx, content_idx, 0] = \
                (video_BR_B + audio_BR_B) / audio_br[content_A]

    else:
        if (codec_A == 'wav2lip_resemble') and (codec_B == 'wav2lip_orig'):
            wav2lip_RSaudio_vs_Origaudio[content_idx] = count_A / (count_A + count_B)
        elif (codec_A == 'wav2lip_orig') and (codec_B == 'wav2lip_resemble'):
            wav2lip_RSaudio_vs_Origaudio[content_idx] = count_B / (count_A + count_B)
        elif (codec_A == 'AVC') and (codec_B == 'AVC'):
            if (crf_A == '26') and (crf_B == '32'):
                avc_video_deg[content_idx] = count_A / (count_A + count_B)
            elif (crf_A == '32') and (crf_B == '26'):
                avc_video_deg[content_idx] = count_B / (count_A + count_B)
            elif (crf_A == '26') and (crf_B == '26'):
                if (audio_BR_A > 7500) and (audio_BR_B < 7500):
                    avc_audio_deg[content_idx] = count_A / (count_A + count_B)
                elif (audio_BR_A < 7500) and (audio_BR_B > 7500):
                    avc_audio_deg[content_idx] = count_B / (count_A + count_B)

        else:
            raise ValueError(f'Some unexpected comparison occured. A: {video_A}, B: {video_B}')


# print(wav2lip_RSaudio_vs_avc, '\n', wav2lip_Origaudio_vs_avc)
# print(wav2lip_RSaudio_vs_av1, '\n', wav2lip_Origaudio_vs_av1)
# print(wav2lip_RSaudio_vs_Origaudio, '\n', avc_video_deg, '\n', avc_audio_deg)

def plot_all_points(data, title, xlabel, ylabel, save_fig=False, save_path=None):
    '''
    :param data: data in format of (#comps)X(#contents)X(2) where 2 for compression gain and #users preferring one
     method
    '''
    plt.figure()
    for i in range(len(contents)):
        plt.scatter(data[:, i, 0], data[:, i, 1] * 100, label=contents[i])
    plt.title(title, fontsize=20)
    plt.xlabel(xlabel, fontsize=16)
    plt.ylabel(ylabel, fontsize=16)
    plt.grid()
    plt.legend()
    plt.ylim(0, 100)
    if save_fig:
        plt.savefig(save_path)


def plot_contents_sep(data, title, xlabel, ylabel, save_fig=False, save_path=None, xticks=None, plot_for='demo'):
    '''
    :param data: data in format of (#comps)X(#contents)X(2) where 2 for compression gain and #users preferring one
     method
    '''
    fig, ax = plt.subplots(2, 3, sharex=True, sharey=True, figsize=(12, 9))
    for i in range(len(contents)):
        j, k = i // 3, i % 3
        ax[j, k].plot(data[:, i, 0], data[:, i, 1] * 100, 'o')
        if plot_for == 'demo':
            ax[j, k].set_title(contents[i])
            label_fontsize = 16
        elif plot_for == 'paper':
            ax[j, k].set_title(f'Content {i + 1}', fontsize=20)
            label_fontsize = 24
        else:
            raise ValueError('Wrong plot_for param. should be demo or paper.')
        ax[j, k].grid()
        ax[j, k].set_ylim(0, 100)
        ax[j, k].set_yticks([0, 20, 40, 60, 80, 100])
        ax[j, k].tick_params(axis='both', which='major', labelsize=16)
        if xticks is not None:
            ax[j, k].set_xlim([min(xticks), max(xticks)])
            ax[j, k].set_xticks(xticks)
        matplotlib.rcParams['font.weight'] = 'light'
        ax[j, k].axhline(50, color='b', ls='--')
    fig.text(0.5, 0.01, xlabel, ha='center', fontsize=label_fontsize)
    fig.text(0.01, 0.5, ylabel, va='center', rotation='vertical', fontsize=label_fontsize)
    if plot_for == 'demo':
        plt.suptitle(title, fontsize=20)
    if save_fig:
        plt.savefig(save_path)


# Mean number of subjects per comparison
mean_num_subjects = np.mean(num_subjects)
mean_num_valid_subjects = np.mean(num_valid_subjects)

print('mean number of subjects per comparison: ', mean_num_subjects)
print('mean number of valid subjects per comparison: ', mean_num_valid_subjects)

## Figures whole
# plot_all_points(wav2lip_RSaudio_vs_avc,
#                 f'Txt2Vid vs AVC; Mean # of subjects = {mean_num_valid_subjects:0.1f}',
#                 'Ratio of Std Codec BR and Txt2Vid BR',
#                 'Users Preferring Txt2Vid Method (%)',
#                 True,
#                 'figures/RSaudio_vs_avc_full.pdf')
# plot_all_points(wav2lip_Origaudio_vs_avc,
#                 f'Audio2Vid vs AVC; Mean # of subjects = {mean_num_valid_subjects:0.1f}',
#                 'Ratio of Std Codec BR and Audio2Vid BR',
#                 'Users Preferring Txt2Vid Method (%)',
#                 True,
#                 'figures/Origaudio_vs_avc_full.pdf')
# plot_all_points(wav2lip_RSaudio_vs_av1,
#                 f'Txt2Vid vs AV1; Mean # of subjects = {mean_num_valid_subjects:0.1f}',
#                 'Ratio of Std Codec BR and Txt2Vid BR',
#                 'Users Preferring Txt2Vid Method (%)',
# #                 True,
# #                 'figures/RSaudio_vs_av1_full.pdf')
# plot_all_points(wav2lip_Origaudio_vs_av1,
#                 f'Audio2Vid vs AV1; Mean # of subjects = {mean_num_valid_subjects:0.1f}',
#                 'Ratio of Std Codec BR and Audio2Vid BR',
#                 'Users Preferring Txt2Vid Method (%)',
# #                 True,
# #                 'figures/Origaudio_vs_av1_full.pdf')
# plt.show()

## Figures as subplots
plot_contents_sep(wav2lip_RSaudio_vs_avc,
                  f'Txt2Vid vs AVC; Mean # of subjects = {mean_num_valid_subjects:0.1f}',
                  'Ratio of Standard Codec and Txt2Vid Bitrate',
                  'Users Preferring Txt2Vid Method (%)',
                  True,
                  'figures/RSaudio_vs_avc_subplots.pdf',
                  # xticks=[100, 500, 1000, 1500, 2000, 2500],
                  xticks=[100, 1000, 2000, 3000],
                  plot_for='paper')  # demo or paper
plot_contents_sep(wav2lip_Origaudio_vs_avc,
                  f'Audio2Vid vs AVC; Mean # of subjects = {mean_num_valid_subjects:0.1f}',
                  'Ratio of Standard Codec and Txt2Vid Bitrate',
                  'Users Preferring Txt2Vid Method (%)',
                  True,
                  'figures/Origaudio_vs_avc_subplots.pdf',
                  xticks=[1, 5, 10, 15, 20],
                  plot_for='paper')  # demo or paper
plot_contents_sep(wav2lip_RSaudio_vs_av1,
                  f'Txt2Vid vs AV1; Mean # of subjects = {mean_num_valid_subjects:0.1f}',
                  'Ratio of Standard Codec and Txt2Vid Bitrate',
                  'Users Preferring Txt2Vid Method (%)',
                  True,
                  'figures/RSaudio_vs_av1_subplots.pdf',
                  xticks=[100, 200, 300, 400],
                  plot_for='paper')  # demo or paper
plot_contents_sep(wav2lip_Origaudio_vs_av1,
                  f'Audio2Vid vs AV1; Mean # of subjects = {mean_num_valid_subjects:0.1f}',
                  'Ratio of Standard Codec and Txt2Vid Bitrate',
                  'Users Preferring Txt2Vid Method (%)',
                  True,
                  'figures/Origaudio_vs_av1_subplots.pdf',
                  xticks=[1, 2, 3, 4],
                  plot_for='paper')  # demo or paper
plt.show()

print('fraction Resemble Audio is better than Original Audio with Wav2Lip')
print(wav2lip_RSaudio_vs_Origaudio)
print('fraction better video quality was chosen in sanity check')
print(avc_video_deg)
print('fraction better audio quality was chosen in sanity check')
print(avc_audio_deg)
