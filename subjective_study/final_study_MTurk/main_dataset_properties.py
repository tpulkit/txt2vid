# Extracts benchmark dataset properties

import os
import numpy as np
import matplotlib.pyplot as plt

benchmark_path = '/Users/pulkit/Google Drive/Stan Projects/tsachy/txt2vid/dataset/subjective_study/benchmark_set'
save_path = 'figures/dataset_properties.pdf'
contents = ['AM', 'MS', 'PP', 'PT', 'SC', 'YL']
codecs = ['AVC', 'AV1']

props = {}
for content in contents:
    props[content] = {}
    for codec in codecs:
        # List of list of audio and video brs
        props[content][codec] = [[], []]

        curr_path = os.path.join(benchmark_path, os.path.join(content, codec))
        files = [x for x in os.listdir(curr_path) if not (x.startswith('.') or x.startswith('Icon'))]

        # print(files)
        for file in files:
            # print(file)
            splits = file.split("_")

            video_crf = splits[2]
            ds = splits[5]
            br_video = splits[8]

            audio_crf = splits[4]
            br_audio = splits[10].split(".")[0]  # to remove .mp4

            props[content][codec][0].append(int(br_video))
            props[content][codec][1].append(int(br_audio))

# fig, ax = plt.subplots(2, 2, figsize=(12, 9))
# for i, codec in enumerate(codecs):
#     for j, content in enumerate(contents):
#         for k in range(2):
#             # to_plot = np.sort(np.unique(np.asarray(props[content][codec][k])))
#             to_plot = np.sort(np.asarray(props[content][codec][k])*1e-3)
#             print(f'{content}, {codec}: {to_plot}')
#             ax[i, k].plot(to_plot, 'o', label=f'Content {j}')
#             ax[i, k].tick_params(axis='y', which='major', labelsize=16)
#
#         ax[i, 0].set_title(f'{codec}', fontsize=24)
#         ax[i, 0].set_ylabel('Video Bitrates (kbps)', fontsize=24)
#         ax[i, 1].set_title(f'AAC', fontsize=24)
#         ax[i, 1].set_ylabel('Audio Bitrates (kbps)', fontsize=24)
#
#     ax[i, 0].legend()
#     ax[i, 1].legend()
#     ax[i, 0].set_xticks([])
#     ax[i, 1].set_xticks([])
# plt.show()
# plt.savefig(save_path)

fig, ax = plt.subplots(1, 2, figsize=(12, 6))
mean_br = {'AVC': np.zeros(8), 'AV1': np.zeros(6)}

for i, codec in enumerate(codecs):
    for j, content in enumerate(contents):
        # to_plot = np.sort(np.unique(np.asarray(props[content][codec][k])))
        to_plot = np.sort(np.asarray(props[content][codec][0]) * 1e-3)
        # print(f'{content}, {codec}: {to_plot}')
        ax[i].plot(to_plot[0::2], 'o', label=f'Content {j + 1}')
    ax[i].tick_params(axis='y', which='major', labelsize=16)
    if codec == 'AVC':
        ax[i].set_title('H.264', fontsize=24)
    else:
        ax[i].set_title('AV1', fontsize=24)
    ax[i].set_ylabel('Video Bitrate (kbps)', fontsize=24)
    # ax[i].legend()
    ax[i].grid()
    ax[i].set_xticks([])
    handles, labels = ax[i].get_legend_handles_labels()
# fig.legend(handles, labels, loc=(0.13, 0.58), fontsize=14)
lgd = fig.legend(handles, labels, bbox_to_anchor=(1.15, 0.9), fontsize=14)
fig.tight_layout(pad=3.0)
plt.savefig(save_path, bbox_extra_artists=(lgd,), bbox_inches='tight')
plt.show()

print("=" * 50)

for codec in codecs:
    sum_v, sum_a = 0, 0
    count = 0
    for k, v in props.items():
        # print(np.sort(np.asarray(props[k][codec][0])))
        sum_v += np.sort(np.asarray(props[k][codec][0]))
        sum_a += np.sort(np.asarray(props[k][codec][1]))
        count += 1

    print(f'{codec} Video Mean Bitrate (kbps): ', sum_v * 1e-3 / count)
    print(f'{codec} Audio Mean Bitrate (kbps): ', sum_a * 1e-3 / count)
