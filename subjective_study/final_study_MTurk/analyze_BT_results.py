# Script to Analyze BT-results

import numpy as np
import matplotlib.pyplot as plt
import json

# Result file
result_file = 'datasets_SUREAL/BT_analysis.json'
BT_results = json.load(open(result_file, 'r'))

# Get compression numbers for txt2vid approach
# in bps (bits per sec)
# Taken from data on popeye2: /raid/tpulkit/txt2vid/dataset/originals/texts

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


# Plotting Functions

def plot_RD(cr, qs, title, cr_scale='linear'):
    plt.figure()
    plt.plot(cr[:-2], qs[:-2], 'bo')
    plt.plot(cr[-2], qs[-2], 'gs')
    plt.plot(cr[-1], qs[-1], 'r*')
    plt.legend(['Std Codecs', 'Wav2Lip_OrigAudio', 'Wav2Lip_ResembleAudio'])
    plt.grid()
    plt.xscale(cr_scale)
    plt.title(title)
    plt.xlabel('Ratio of Standard Codec and Txt2Vid Bitrate')
    plt.ylabel('Quality Score (BT)')
    plt.show()


def plot_tradeoff(cr, qs, vbr_frac, title, cr_scale='linear'):
    plt.figure()
    # plt.scatter(cr[:-2], qs[:-2], c=vbr_frac, cmap='viridis', marker='o')
    plt.scatter(cr[:-2], qs[:-2], c=vbr_frac, cmap='binary', marker='o', vmin=0.4, vmax=1)
    plt.colorbar()
    plt.plot(cr[-2], qs[-2], 'gs')
    plt.plot(cr[-1], qs[-1], 'r*')
    plt.legend(['Wav2Lip_OrigAudio', 'Wav2Lip_ResembleAudio'])
    plt.grid()
    plt.xscale(cr_scale)
    plt.title(title)
    plt.xlabel('Ratio of Standard Codec and Txt2Vid Bitrate')
    plt.ylabel('Quality Score (BT)')
    plt.show()


def plot_tradeoff_singlePlot(cr_all, qs_all, vbr_frac_all, cr_scale='linear',
                             save_file=False, save_path=None):
    fig, ax = plt.subplots(2, 3, sharex=True, sharey=True, figsize=(12, 9))
    for i in range(num_contents):
        j, k = i // 3, i % 3
        content = contents[i]
        cr, qs, vbr_frac = cr_all[content], qs_all[content], vbr_frac_all[content]

        im = ax[j, k].scatter(cr[:-2], qs[:-2], c=vbr_frac,
                              cmap='Blues', marker='o', vmin=0.4, vmax=1,
                              label='Benchmark Videos')
        ax[j, k].plot(cr[-1], qs[-1], 'r*', label='Txt2Vid (From Text)')
        ax[j, k].plot(cr[-2], qs[-2], 'gs', label='Txt2Vid (From Original Audio)')
        ax[j, k].set_title(f'Content {i + 1}', fontsize=20)
        # ax[j, k].legend(['Wav2Lip_OrigAudio', 'Wav2Lip_ResembleAudio'], fontsize=16)
        ax[j, k].grid()
        ax[j, k].set_xscale(cr_scale)
        if cr_scale == 'log':
            ax[j, k].set_xticks([1, 10, 100, 1000])
            ax[j, k].tick_params(axis='both', which='major', labelsize=16)
        elif cr_scale == 'linear':
            ax[j, k].set_xticks([1, 500, 1000, 1500, 2000])
            ax[j, k].tick_params(axis='both', which='major', labelsize=12)

    fig.text(0.5, 0.01, 'Ratio of Standard Codec and Txt2Vid Bitrate', ha='center', fontsize=24)
    fig.text(0.01, 0.5, 'Quality Score (BTL)', va='center',
             rotation='vertical', fontsize=24)

    fig.subplots_adjust(top=0.8, right=0.9)
    cbar_ax = fig.add_axes([0.92, 0.10, 0.02, 0.7])
    cbar_ax.tick_params(labelsize=16)
    cb = fig.colorbar(im, cax=cbar_ax)
    cb.set_label('Fraction of Video Bitrate over Total AV Bitrate', fontsize=16)


    handles, labels = ax[j,k].get_legend_handles_labels()
    fig.legend(handles, labels, fontsize=16, loc=[0.55, 0.87])

    if save_file:
        plt.savefig(save_path)
    else:
        plt.show()


# Extract results
video_BRs, audio_BRs, text_BRs, video_frac_BRs, total_BRs = {}, {}, {}, {}, {}
compression_ratio_txt2vid = {}
quality_scores = {}

for content_id, content in enumerate(contents):
    results_content_dict = BT_results[f'Content{content_id + 1}'][0]  # +1 since content IDs begin from 1
    quality_scores[content] = results_content_dict['quality_scores']
    videos = results_content_dict['dis_video_names']
    num_videos = len(videos)

    video_BRs[content], audio_BRs[content], text_BRs[content] = [], [], []
    video_frac_BRs[content], total_BRs[content] = [], []

    for video in videos:
        content_name, codec, video_BR, audio_BR, crf, ds = vid_properties(video)
        assert content == content_name

        if codec == 'AVC' or codec == 'AV1':
            video_BRs[content].append(video_BR)
            audio_BRs[content].append(audio_BR)
            text_BRs[content].append(0)
        elif codec == 'wav2lip_orig':
            video_BRs[content].append(0)
            audio_BRs[content].append(audio_br[content])
            text_BRs[content].append(0)
        elif codec == 'wav2lip_resemble':
            video_BRs[content].append(0)
            audio_BRs[content].append(0)
            text_BRs[content].append(txt_br[content])
        else:
            raise ValueError('Wrong Codec')

    total_BRs[content] = [(video_BRs[content][i] + audio_BRs[content][i] + text_BRs[content][i])
                          for i in
                          range(num_videos)]
    compression_ratio_txt2vid[content] = [total_BRs[content][i] / txt_br[content]
                                          for i in range(num_videos)]
    video_frac_BRs[content] = [video_BRs[content][i] / (audio_BRs[content][i] + video_BRs[content][i])
                               for i in range(num_videos - 2)] # don't calculate for videos generated by our tool

    # plot_RD(compression_ratio_txt2vid[content], quality_scores[content],
    #         title=f'Content {content_id + 1}', cr_scale='linear')
    # plot_RD(compression_ratio_txt2vid[content], quality_scores[content],
    #         title=f'Content {content_id + 1}', cr_scale='log')

    # plot_tradeoff(compression_ratio_txt2vid[content], quality_scores[content],
    #               video_frac_BRs[content],
    #               title=f'Content {content_id + 1}', cr_scale='linear')
    # plot_tradeoff(compression_ratio_txt2vid[content], quality_scores[content],
    #               video_frac_BRs[content],
    #               title=f'Content {content_id + 1}', cr_scale='log')

# plot_tradeoff_singlePlot(compression_ratio_txt2vid, quality_scores, video_frac_BRs,
#                          cr_scale='linear', save_file=True, save_path='figures/BT_results_linear.pdf')
plot_tradeoff_singlePlot(compression_ratio_txt2vid, quality_scores, video_frac_BRs,
                         cr_scale='log', save_file=True, save_path='figures/BT_results_log.pdf')