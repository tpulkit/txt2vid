# Script to analyze main study data collected using qualtrics on the final dataset
import pandas as pd
import numpy as np

# Data files
data_file = 'Video Quality Survey5_June 18, 2021_07.00.csv'

comp_pairs_file = 'Pair_ID.csv'
num_comps = 186  # 186 different comparisons in study
starting_comp = 0
end_comp = starting_comp + num_comps
results_file = 'results.csv'

# Read data
df_data = pd.read_csv(data_file)
num_rows = len(df_data.index)
# -2 because 2 rows of metadata
total_subjects = num_rows - 2
# print(num_rows, total_subjects)

df_pairs = pd.read_csv(comp_pairs_file)

results_dict = {
    'video_A': [],
    'video_B': [],
    'count_A': [],
    'count_B': [],
    'num_subjects': [],
    'valid_subjects': [],
}

# Extract and save a data frame containing results

# Prune out people who took less than time_thr time to complete the study
time_thr = 600  # 10 minutes
valid_subjects = 0

# RandomIDs to Exclude based on mturk_duplicates.py
random_IDs_to_exclude = [46843, 61666]

for i in range(starting_comp, end_comp):
    curr_comp = f"vid_{i}"
    ser = pd.Series(df_data[curr_comp]).head(num_rows)
    values = ser[2:2 + num_rows].values

    # find if valid or not
    # time > time_thr, finished should be true and the reviewer shouldn't be repeating the same content
    # For third pair, we use hard-coded RandomID found using mturk_duplicates.py
    if i == starting_comp:
        time = pd.Series(df_data['Duration (in seconds)']).head(num_rows)
        time_values = np.array(time[2:2 + num_rows].values, dtype='int')

        finished = pd.Series(df_data['Finished']).head(num_rows)
        finished = np.array(finished[2:2 + num_rows].values)

        random_IDs = pd.Series(df_data['RandomID']).head(num_rows)
        random_IDs = np.array(random_IDs[2:2 + num_rows].values, dtype='int')

        valid_random_IDs = np.ones(random_IDs.shape, dtype='bool')
        for ID in random_IDs_to_exclude:
            valid_random_IDs *= (random_IDs != ID)

        valid_subjects = (time_values > time_thr) * (finished == 'True') * valid_random_IDs
        total_valid_subjects = np.sum(valid_subjects)


    # Find total responses for this comparison
    no_response_subjects = pd.isna(values)
    not_valid_response_subjects = np.logical_and(np.logical_not(valid_subjects),
                                                 np.logical_not(no_response_subjects))
    num_valid_subjects_comp = np.sum(np.logical_and(valid_subjects,
                                                    np.logical_not(no_response_subjects)))

    count_total = total_subjects - np.sum(no_response_subjects) - np.sum(not_valid_response_subjects)
    values = np.array(values)

    video_A = df_pairs.iloc[i]['video_A']
    video_B = df_pairs.iloc[i]['video_B']

    count_A = np.sum(values[valid_subjects] == video_A)
    count_B = np.sum(values[valid_subjects] == video_B)

    # print(values, '\n', video_A, '\n', video_B)
    # print(count_A, '\n', count_B, '\n', count_total)
    # print(total_valid_subjects, '\n', np.sum(no_response_subjects), '\n', np.sum(not_valid_response_subjects))

    if count_A + count_B != count_total:
        raise ValueError('results for a comparison did not belong to pairs being compared')

    # subjects who did this comparison
    num_subjects = total_subjects - np.sum(no_response_subjects)

    results_dict['video_A'].append(video_A)
    results_dict['video_B'].append(video_B)
    results_dict['count_A'].append(count_A)
    results_dict['count_B'].append(count_B)
    results_dict['num_subjects'].append(num_subjects)
    results_dict['valid_subjects'].append(num_valid_subjects_comp)

# add total and valid subjects
results_dict['total_subjects'] = total_subjects
results_dict['total_valid_subjects'] = total_valid_subjects
print('Total Number of Subjects: ', total_subjects)
print('Total Number of Valid Subjects: ', total_valid_subjects)

# Save results in a dataframe
pd_results = pd.DataFrame(results_dict)
pd_results.to_csv(results_file)
