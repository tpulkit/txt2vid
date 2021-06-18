# Find if any duplicated results

import pandas as pd

study1_file = 'mturk workers/Batch_4476077_batch_results_study1.csv'
study2_file = 'mturk workers/Batch_4476955_batch_results_study2.csv'
qualtrics_file = 'Video Quality Survey5_June 17, 2021_08.09.csv'

df_study1 = pd.read_csv(study1_file)
df_study2 = pd.read_csv(study2_file)
df_qualtrics = pd.read_csv(qualtrics_file)

num_rows_study1 = len(df_study1.index)
num_rows_study2 = len(df_study2.index)
num_rows_qualtrics = len(df_qualtrics)

workerIDs_study1 = pd.Series(df_study1['WorkerId']).head(num_rows_study1).values
workerIDs_study2 = pd.Series(df_study2['WorkerId']).head(num_rows_study2).values

codes_study1 = pd.Series(df_study1['Answer.surveycode']).head(num_rows_study1).values
codes_study2 = pd.Series(df_study2['Answer.surveycode']).head(num_rows_study2).values
codes_qualtrics = pd.Series(df_qualtrics['RandomID'].head(num_rows_qualtrics)).values

dup_codes = []

# find duplciate code pairs
for i, WID1 in enumerate(workerIDs_study1):
    for j, WID2 in enumerate(workerIDs_study2):
        if WID1 == WID2:
            # ToDo: One weird case where the worker had same codes from both studies but in qualtrics only 1 exist :(
            if codes_study1[i] == codes_study2[j]:
                continue
            dup_codes.append([codes_study1[i], codes_study2[j]])

# print(dup_codes)
print('dup_codes:\n', dup_codes)
num_dups = len(dup_codes)
print('Number of duplicates: ', num_dups)

# find code pairs which can be verified in the qualtrics study as some MTurk users didn't record their codes
verifiable_dup_codes = []
for i, code_pair in enumerate(dup_codes):
    code1, code2 = code_pair

    if (code1 in codes_qualtrics) and (code2 in codes_qualtrics):
        verifiable_dup_codes.append([code1, code2])

print('verifiable_dup_codes:\n', verifiable_dup_codes)
num_verifiable_dups = len(verifiable_dup_codes)
print('Number of verifiable duplicates:', num_verifiable_dups)

# find content these pairs saw
check_indices = [0, 31, 62, 93, 124, 155]
content_IDs = ['MS', 'SC', 'AM', 'PP', 'PT', 'YL']
content_seen = []
which_content = []
which_code_pairs = []
for i, code_pair in enumerate(verifiable_dup_codes):
    content_seen.append(False)
    code1, code2 = code_pair
    df1 = df_qualtrics[df_qualtrics['RandomID'] == code1]
    df2 = df_qualtrics[df_qualtrics['RandomID'] == code2]
    for j, idx in enumerate(check_indices):
        curr_comp = f"vid_{idx}"
        # print(i, j)
        # print(df_combined[curr_comp])
        # if i == 18 and j == 0:
        #     print(df_combined)
        #     print(code_pair)
        if df1[curr_comp].iloc[0] == df2[curr_comp].iloc[0]:
            content_seen[i] = True
            which_content.append(content_IDs[j])
            which_code_pairs.append(code_pair)

print('Number of duplicate MTurk users who saw same content = ' + str(sum(content_seen)))
print('Content Seen which was repeated: ', which_content)
print('Code Pairs Seen which was repeated: ', which_code_pairs)
