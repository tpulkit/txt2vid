# Script to analyze pilot study data collected using qualtrics on one content
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# params
# data_file = 'Video Quality Survey (640x480)_May 7, 2021_07.55.csv'
data_file = 'Video Quality Survey (640x480)_May 14, 2021_08.10.csv'
num_comps = 35

# Comparisons in order -- add to map to values later
choices = [
    ['Video A1', 'Video B1'],
    ['Video A1', 'Video B2'],
    ['Video A1', 'Video B3'],
    ['Video A1', 'Video B4'],
    ['Video A1', 'Video B5'],
    ['Video A1', 'Video B6'],
    ['Video A1', 'Video B7'],
    ['Video A1', 'Video B8'],
    ['Video A1', 'Video B9'],
    ['Video A1', 'Video B10'],
    ['Video A2', 'Video B1'],
    ['Video A2', 'Video B2'],
    ['Video A2', 'Video B3'],
    ['Video A2', 'Video B4'],
    ['Video A2', 'Video B5'],
    ['Video A2', 'Video B6'],
    ['Video A2', 'Video B7'],
    ['Video A2', 'Video B8'],
    ['Video A2', 'Video B9'],
    ['Video A2', 'Video B10'],
    ['Video B2', 'Video B3'],
    ['Video A2', 'Video A2'],
    ['Video A2', 'Video A1'],
    ['Video A3', 'Video A1'],
    ['Video A3', 'Video A2'],
    ['Video A3', 'Video B1'],
    ['Video A3', 'Video B2'],
    ['Video A3', 'Video B3'],
    ['Video A3', 'Video B4'],
    ['Video A3', 'Video B5'],
    ['Video A3', 'Video B6'],
    ['Video A3', 'Video B7'],
    ['Video A3', 'Video B8'],
    ['Video A3', 'Video B9'],
    ['Video A3', 'Video B10'],
]
mapping = [
    ['Video A1', 'Original_audio_driving_video.mp4'],
    ['Video A2', 'resemble_audio_driving_video.mp4'],
    ['Video A3', 'original_audio_driving_video_AAC_br1k_bitrateA_4009.mp4'],
    ['Video B1', 'AV1_crf63_AAC_br1_bitrateV_14659_bitrateA_4025.mp4'],
    ['Video B2', 'AV1_crf63_AAC_br1_ds2_us2_bitrateV_8158_bitrateA_4025.mp4'],
    ['Video B3', 'AV1_crf63_AAC_br50_bitrateV_14659_bitrateA_50216.mp4'],
    ['Video B4', 'AVC_crf30_AAC_br1_ds2_us2_bitrateV_55835_bitrateA_4025.mp4'],
    ['Video B5', 'AVC_crf30_AAC_br50_ds2_us2_bitrateV_55835_bitrateA_50216.mp4'],
    ['Video B6', 'AVC_crf35_AAC_br1_bitrateV_94366_bitrateA_4025.mp4'],
    ['Video B7', 'AVC_crf35_AAC_br50_bitrateV_94366_bitrateA_50216.mp4'],
    ['Video B8', 'AVC_crf40_AAC_br1_ds2_us2_bitrateV_12636_bitrateA_4025.mp4'],
    ['Video B9', 'AVC_crf40_AAC_br50_ds2_us2_bitrateV_12636_bitrateA_50216.mp4'],
    ['Video B10', 'AV1_crf63_AAC_br50_ds2_us2_bitrateV_8158_bitrateA_50216.mp4'],
]

# data = np.genfromtxt(data_file, delimiter=',')
df = pd.read_csv(data_file)
num_rows = len(df.index)
# -2 because 2 rows of metadata
num_subjects = num_rows - 2
print(num_rows, num_subjects)

# print(df)
# print(df[["Pair-1"]])
# print(df[["Pair-1"]])
# print(df.at[2, "Pair-1"])
# ser = pd.Series(df["Pair-1"]).head(num_rows)
# print(ser[2:2+num_rows].values)

data = np.zeros((num_comps, num_subjects), dtype='bool')
data_list = []

# plots for comparison:
resemble_audio_vs_AVC = np.zeros(6)
resemble_audio_vs_AV1 = np.zeros(4)
orig_audio_vs_AVC = np.zeros(6)
orig_audio_vs_AV1 = np.zeros(4)
orig_audio_low_quality_vs_AVC = np.zeros(6)
orig_audio_low_quality_vs_AV1 = np.zeros(4)

avc_br_audio = [4025, 50216, 4025, 50216, 4025, 50216]
avc_br_video = [55835, 55835, 94366, 94366, 12636, 12636]
av1_br_audio = [4025, 4025, 50216, 50216]
av1_br_video = [14659, 8158, 14659, 8158]
# avc_br = [55835 + 4025, 55835 + 50216, 94366 + 4025, 94366 + 50216, 12636 + 4025, 12636 + 50216]
# av1_br = [14659 + 4025, 8158 + 4025, 14659 + 50216, 8158 + 50216]
avc_br = [x + y for (y, x) in zip(avc_br_video, avc_br_audio)]
av1_br = [x + y for (y, x) in zip(av1_br_video, av1_br_audio)]

txt_br = 84
orig_audio_br = 50216  # 72000
orig_audio_low_quality_br = 4009  #### CHECK!!!!!!!
cr_resemble_AVC = [x / txt_br for x in avc_br]
cr_resemble_AV1 = [x / txt_br for x in av1_br]
cr_orig_audio_AVC = [x / orig_audio_br for x in avc_br]
cr_orig_audio_AV1 = [x / orig_audio_br for x in av1_br]
cr_orig_audio_low_quality_AVC = [x / orig_audio_low_quality_br for x in avc_br]
cr_orig_audio_low_quality_AV1 = [x / orig_audio_low_quality_br for x in av1_br]

for i in range(num_comps):
    curr_comp = f"Pair-{i + 1}"
    ser = pd.Series(df[curr_comp]).head(num_rows)
    values = ser[2:2 + num_rows].values
    data_list.append(values)

    curr_choice = choices[i]

    for j in range(num_subjects):
        if values[j][-8:] == curr_choice[0][-8:]:
            data[i, j] = 0
        elif values[j][-8:] == curr_choice[1][-8:]:
            data[i, j] = 1
        else:
            raise ValueError(f"Error in comp {i}, subject {j}: {values[j]}, {curr_choice}, {values[j][-8:]}")

    # hardcoded to extract data
    if 0 <= i < 3:
        orig_audio_vs_AV1[i] = num_subjects - np.sum(data[i, :])
    elif 3 <= i < 9:
        orig_audio_vs_AVC[i - 3] = num_subjects - np.sum(data[i, :])
    elif i == 9:
        orig_audio_vs_AV1[3] = num_subjects - np.sum(data[i, :])
    elif 10 <= i < 13:
        resemble_audio_vs_AV1[i - 10] = num_subjects - np.sum(data[i, :])
    elif 13 <= i < 19:
        resemble_audio_vs_AVC[i - 13] = num_subjects - np.sum(data[i, :])
    elif i == 19:
        resemble_audio_vs_AV1[3] = num_subjects - np.sum(data[i, :])
    elif 25 <= i < 28:
        orig_audio_low_quality_vs_AV1[i - 25] = num_subjects - np.sum(data[i, :])
    elif 28 <= i < 34:
        orig_audio_low_quality_vs_AVC[i - 28] = num_subjects - np.sum(data[i, :])
    elif i == 34:
        orig_audio_low_quality_vs_AV1[3] = num_subjects - np.sum(data[i, :])

print(np.sum(data, axis=1))


# plt.figure()
# num_second_choice = np.sum(data, axis=1)
# num_first_choice = total_subjects - num_second_choice
# x_axis = np.arange(num_comps)
#
# plt.bar(x_axis, num_first_choice, color='r')
# plt.bar(x_axis, num_second_choice, bottom=num_first_choice, color='b')
# # plt.xticks(x_axis, choices)
# plt.show()

def plot_score_br(plotting_dict, codec):
    """
    :param plotting_dict: dictionary with cr and subjective advantage
    :param codec: 'av1' or 'avc'
    :return: plot with score on y axis and br advantage against std codec on x
    """
    codecs = ['av1', 'avc', 'AV1', 'AVC']
    if codec not in codecs:
        raise ValueError(f'codec specified: {codec} not AV1 or AVC')

    cr_resemble_vs_codec = plotting_dict['cr_resemble_vs_codec']
    resemble_audio_vs_codec = plotting_dict['resemble_audio_vs_codec']
    cr_orig_audio_vs_codec = plotting_dict['cr_orig_audio_vs_codec']
    orig_audio_vs_codec = plotting_dict['orig_audio_vs_codec']
    cr_orig_audio_low_quality_vs_codec = plotting_dict['cr_orig_audio_low_quality_vs_codec']
    orig_audio_low_quality_vs_codec = plotting_dict['orig_audio_low_quality_vs_codec']
    audio_br = plotting_dict['audio_br']
    video_br = plotting_dict['video_br']

    fig, ax = plt.subplots(1, 3, sharey=True, figsize=(15, 5))
    plt.setp(ax, yticks=np.arange(0, num_subjects + 1, 1))
    ax[0].plot(cr_resemble_vs_codec, resemble_audio_vs_codec, 'o')
    br = '\n'
    text_label = [f'V:{x};{br}A:{y}' for (x, y) in zip(video_br, audio_br)]
    for i in range(len(cr_resemble_vs_codec)):
        ax[0].annotate(text_label[i], (cr_resemble_vs_codec[i], resemble_audio_vs_codec[i]),
                       textcoords='data', size=12)
    ax[0].set_title('Resemble')
    ax[0].grid()
    ax[1].plot(cr_orig_audio_vs_codec, orig_audio_vs_codec, 'o')
    for i in range(len(cr_orig_audio_vs_codec)):
        ax[1].annotate(text_label[i], (cr_orig_audio_vs_codec[i], orig_audio_vs_codec[i]),
                       textcoords='data', size=12)
    ax[1].set_title('Orig. Audio')
    ax[1].grid()
    ax[2].plot(cr_orig_audio_low_quality_vs_codec, orig_audio_low_quality_vs_codec, 'o')
    for i in range(len(cr_orig_audio_low_quality_vs_codec)):
        ax[2].annotate(text_label[i], (cr_orig_audio_low_quality_vs_codec[i],
                                       orig_audio_low_quality_vs_codec[i]),
                       textcoords='data', size=12)
    ax[2].set_title('Orig. Audio Low Quality')
    ax[2].grid()
    # plt.xlabel('Ratio of Std Codec BR and Our BR')
    fig.text(0.5, 0.01, 'Ratio of Std Codec BR and Our BR', ha='center', fontsize=16)
    # plt.ylabel('# Users Preferring Our Method')
    fig.text(0.04, 0.5, '# Users Preferring Our Method', va='center', rotation='vertical', fontsize=16)
    plt.suptitle(f'Comparison against {codec.upper()}', fontsize=20)
    fig.subplots_adjust(hspace=.5)
    plt.show()


def plot_br_score(plotting_dict, codec):
    """
    :param plotting_dict: dictionary with cr and subjective advantage
    :param codec: 'av1' or 'avc'
    :return: plot with score on x axis and br advantage against std codec on y
    """
    codecs = ['av1', 'avc']
    if codec not in codecs:
        raise ValueError(f'codec specified: {codec} not AV1 or AVC')

    cr_resemble_vs_codec = plotting_dict['cr_resemble_vs_codec']
    resemble_audio_vs_codec = plotting_dict['resemble_audio_vs_codec']
    cr_orig_audio_vs_codec = plotting_dict['cr_orig_audio_vs_codec']
    orig_audio_vs_codec = plotting_dict['orig_audio_vs_codec']
    cr_orig_audio_low_quality_vs_codec = plotting_dict['cr_orig_audio_low_quality_vs_codec']
    orig_audio_low_quality_vs_codec = plotting_dict['orig_audio_low_quality_vs_codec']
    audio_br = plotting_dict['audio_br']
    video_br = plotting_dict['video_br']

    fig, ax = plt.subplots(3, 1, sharex=True, figsize=(5, 15))
    plt.setp(ax, xticks=np.arange(0, num_subjects + 1, 1))
    ax[0].plot(resemble_audio_vs_codec, cr_resemble_vs_codec, 'o')
    # br = '\n'
    text_label = [f'V:{x}; A:{y}' for (x, y) in zip(video_br, audio_br)]
    for i in range(len(cr_resemble_vs_codec)):
        ax[0].annotate(text_label[i], (resemble_audio_vs_codec[i], cr_resemble_vs_codec[i]),
                       textcoords='data', size=12)
    ax[0].set_title('Resemble', pad=5)
    ax[0].grid()
    ax[1].plot(orig_audio_vs_codec, cr_orig_audio_vs_codec, 'o')
    for i in range(len(cr_orig_audio_vs_codec)):
        ax[1].annotate(text_label[i], (orig_audio_vs_codec[i], cr_orig_audio_vs_codec[i]),
                       textcoords='data', size=12)
    ax[1].set_title('Orig. Audio')
    ax[1].grid()
    ax[2].plot(orig_audio_low_quality_vs_codec, cr_orig_audio_low_quality_vs_codec, 'o')
    for i in range(len(cr_orig_audio_low_quality_vs_codec)):
        ax[2].annotate(text_label[i], (orig_audio_low_quality_vs_codec[i],
                                       cr_orig_audio_low_quality_vs_codec[i]),
                       textcoords='data', size=12)
    ax[2].set_title('Orig. Audio Low Quality', pad=5)
    ax[2].grid()
    # plt.xlabel('Ratio of Std Codec BR and Our BR')
    fig.text(0.01, 0.5, 'Ratio of Std Codec BR and Our BR', va='center',
             rotation='vertical',
             fontsize=16)
    # plt.ylabel('# Users Preferring Our Method')
    fig.text(0.5, 0.01, '# Users Preferring Our Method', ha='center', fontsize=16)
    plt.suptitle(f'Comparison against {codec.upper()}', fontsize=20)
    fig.subplots_adjust(hspace=.5)
    plt.show()


def plot_br_score_bar(plotting_dict, codec):
    """
    :param plotting_dict: dictionary with cr and subjective advantage
    :param codec: 'av1' or 'avc'
    :return: plot with score on x axis and br advantage against std codec on y
    """
    codecs = ['av1', 'avc']
    if codec not in codecs:
        raise ValueError(f'codec specified: {codec} not AV1 or AVC')

    cr_resemble_vs_codec = plotting_dict['cr_resemble_vs_codec']
    resemble_audio_vs_codec = plotting_dict['resemble_audio_vs_codec']
    cr_orig_audio_vs_codec = plotting_dict['cr_orig_audio_vs_codec']
    orig_audio_vs_codec = plotting_dict['orig_audio_vs_codec']
    cr_orig_audio_low_quality_vs_codec = plotting_dict['cr_orig_audio_low_quality_vs_codec']
    orig_audio_low_quality_vs_codec = plotting_dict['orig_audio_low_quality_vs_codec']
    audio_br = plotting_dict['audio_br']
    video_br = plotting_dict['video_br']

    first_bar_ratio = np.asarray([x/(x+y) for (x, y) in zip(video_br, audio_br)])

    fig, ax = plt.subplots(3, 1, sharex=True, figsize=(5, 15))
    plt.setp(ax, xticks=np.arange(0, num_subjects + 1, 1))
    ax[0].bar(resemble_audio_vs_codec, cr_resemble_vs_codec * first_bar_ratio, color='r', alpha=0.3, label='Video Frac')
    ax[0].bar(resemble_audio_vs_codec, cr_resemble_vs_codec * (1 - first_bar_ratio),
              color='b', bottom=cr_resemble_vs_codec * first_bar_ratio, alpha=0.3, label='Audio Frac')
    # text_label = [f'V:{x}; A:{y}' for (x, y) in zip(video_br, audio_br)]
    # for i in range(len(cr_resemble_vs_codec)):
    #     ax[0].annotate(text_label[i], (resemble_audio_vs_codec[i], cr_resemble_vs_codec[i]),
    #                    textcoords='data', size=12)
    ax[0].set_title('Resemble', pad=5)
    ax[0].grid()
    ax[1].bar(orig_audio_vs_codec, cr_orig_audio_vs_codec * first_bar_ratio, color='r', alpha=0.3, label='Video Frac')
    ax[1].bar(orig_audio_vs_codec, cr_orig_audio_vs_codec * (1 - first_bar_ratio),
              color='b', bottom=cr_orig_audio_vs_codec * first_bar_ratio, alpha=0.3, label='Audio Frac')
    # for i in range(len(cr_orig_audio_vs_codec)):
    #     ax[1].annotate(text_label[i], (orig_audio_vs_codec[i], cr_orig_audio_vs_codec[i]),
    #                    textcoords='data', size=12)
    ax[1].set_title('Orig. Audio')
    ax[1].grid()
    ax[2].bar(orig_audio_low_quality_vs_codec, cr_orig_audio_low_quality_vs_codec * first_bar_ratio,
              color='r', alpha=0.3, label='Video Frac')
    ax[2].bar(orig_audio_low_quality_vs_codec, cr_orig_audio_low_quality_vs_codec * (1 - first_bar_ratio),
              color='b', bottom=cr_orig_audio_low_quality_vs_codec * first_bar_ratio, alpha=0.3, label='Audio Frac')
    # for i in range(len(cr_orig_audio_low_quality_vs_codec)):
    #     ax[2].annotate(text_label[i], (orig_audio_low_quality_vs_codec[i],
    #                                    cr_orig_audio_low_quality_vs_codec[i]),
    #                    textcoords='data', size=12)
    ax[2].set_title('Orig. Audio Low Quality', pad=5)
    ax[2].grid()
    # plt.xlabel('Ratio of Std Codec BR and Our BR')
    fig.text(0.01, 0.5, 'Ratio of Std Codec BR and Our BR', va='center',
             rotation='vertical',
             fontsize=16)
    # plt.ylabel('# Users Preferring Our Method')
    fig.text(0.5, 0.01, '# Users Preferring Our Method', ha='center', fontsize=16)
    plt.suptitle(f'Comparison against {codec.upper()}', fontsize=20)
    fig.subplots_adjust(hspace=.5)
    plt.legend()
    plt.show()


plotting_data = {'cr_resemble_vs_codec': cr_resemble_AVC,
                 'resemble_audio_vs_codec': resemble_audio_vs_AVC,
                 'cr_orig_audio_vs_codec': cr_orig_audio_AVC,
                 'orig_audio_vs_codec': orig_audio_vs_AVC,
                 'cr_orig_audio_low_quality_vs_codec': cr_orig_audio_low_quality_AVC,
                 'orig_audio_low_quality_vs_codec': orig_audio_low_quality_vs_AVC,
                 'audio_br': avc_br_audio,
                 'video_br': avc_br_video
                 }
plot_score_br(plotting_data, 'avc')
plot_br_score_bar(plotting_data, 'avc')
plotting_data = {'cr_resemble_vs_codec': cr_resemble_AV1,
                 'resemble_audio_vs_codec': resemble_audio_vs_AV1,
                 'cr_orig_audio_vs_codec': cr_orig_audio_AV1,
                 'orig_audio_vs_codec': orig_audio_vs_AV1,
                 'cr_orig_audio_low_quality_vs_codec': cr_orig_audio_low_quality_AV1,
                 'orig_audio_low_quality_vs_codec': orig_audio_low_quality_vs_AV1,
                 'audio_br': av1_br_audio,
                 'video_br': av1_br_video
                 }
plot_score_br(plotting_data, 'av1')
plot_br_score_bar(plotting_data, 'av1')

# fig, ax = plt.subplots(1, 3, sharey=True, figsize=(15, 5))
# plt.setp(ax, yticks=np.arange(0, total_subjects + 1, 1))
# ax[0].plot(cr_resemble_AVC, resemble_audio_vs_AVC, 'o')
# text_label = [f'V:{x}+A:{y}' for (x, y) in zip(avc_br_video, avc_br_audio)]
# for i in range(len(cr_resemble_AVC)):
#     ax[0].annotate(text_label[i], (cr_resemble_AVC[i], resemble_audio_vs_AVC[i]),
#                    textcoords='data', size=12)
# ax[0].set_title('Resemble')
# ax[0].grid()
# ax[1].plot(cr_orig_audio_AVC, orig_audio_vs_AVC, 'o')
# for i in range(len(cr_orig_audio_AVC)):
#     ax[1].annotate(text_label[i], (cr_orig_audio_AVC[i], orig_audio_vs_AVC[i]),
#                    textcoords='data', size=12)
# ax[1].set_title('Orig. Audio')
# ax[1].grid()
# ax[2].plot(cr_orig_audio_low_quality_AVC, cr_orig_audio_low_quality_AVC, 'o')
# for i in range(len(cr_orig_audio_low_quality_AVC)):
#     ax[2].annotate(text_label[i], (cr_orig_audio_low_quality_AVC[i], cr_orig_audio_low_quality_AVC[i]),
#                    textcoords='data', size=12)
# ax[2].set_title('Orig. Audio Low Quality')
# ax[2].grid()
# # plt.xlabel('Ratio of Std Codec BR and Our BR')
# fig.text(0.5, 0.01, 'Ratio of Std Codec BR and Our BR', ha='center', fontsize=16)
# # plt.ylabel('# Users Preferring Our Method')
# fig.text(0.04, 0.5, '# Users Preferring Our Method', va='center', rotation='vertical', fontsize=16)
# plt.suptitle('Comparison against AVC', fontsize=20)
# fig.subplots_adjust(hspace=.5)
# plt.show()
#
# fig, ax = plt.subplots(1, 3, sharey=True, figsize=(15, 5))
# plt.setp(ax, yticks=np.arange(0, total_subjects + 1, 1))
# ax[0].plot(cr_resemble_AV1, resemble_audio_vs_AV1, 'o')
# ax[0].set_title('Resemble')
# ax[0].grid()
# ax[1].plot(cr_orig_audio_AV1, orig_audio_vs_AV1, 'o')
# ax[1].set_title('Orig. Audio')
# ax[1].grid()
# ax[2].plot(cr_orig_audio_low_quality_AV1, orig_audio_low_quality_vs_AV1, 'o')
# ax[2].set_title('Orig. Audio Low Quality')
# ax[2].grid()
# # plt.xlabel('Ratio of Std Codec BR and Our BR')
# fig.text(0.5, 0.01, 'Ratio of Std Codec BR and Our BR', ha='center', fontsize=16)
# # plt.ylabel('# Users Preferring Our Method')
# fig.text(0.04, 0.5, '# Users Preferring Our Method', va='center', rotation='vertical', fontsize=16)
# plt.suptitle('Comparison against AV1', fontsize=20)
# fig.subplots_adjust(hspace=.5)
# plt.show()

print('AVC, Resemble:', cr_resemble_AVC, resemble_audio_vs_AVC)
print('AVC, Orig Audio:', cr_orig_audio_AVC, orig_audio_vs_AVC)
print('AVC, Orig Audio Low Quality:', cr_orig_audio_low_quality_AVC, orig_audio_low_quality_vs_AVC)
print('AV1, Resemble:', cr_resemble_AV1, resemble_audio_vs_AV1)
print('AV1, Orig Audio:', cr_orig_audio_AV1, orig_audio_vs_AV1)
print('AV1, Orig Audio Low Quality:', cr_orig_audio_low_quality_AV1, orig_audio_low_quality_vs_AV1)
print('AVC BR:', avc_br)
print('AV1 BR:', av1_br)
