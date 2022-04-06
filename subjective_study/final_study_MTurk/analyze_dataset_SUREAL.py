import sys
import os
from matplotlib import pyplot as plt
sys.path.append('sureal')
import json

from sureal.config import SurealConfig, DisplayConfig
from sureal.routine import run_subjective_models, visualize_pc_dataset
from sureal.pc_subjective_model import BradleyTerryNewtonRaphsonPairedCompSubjectiveModel, \
    BradleyTerryMlePairedCompSubjectiveModel, ThurstoneMlePairedCompSubjectiveModel
from sureal.dataset_reader import PairedCompDatasetReader

def run_pc_subjective_models(dataset_filepath, subjective_model_classes=None):
    if subjective_model_classes is None:
        subjective_model_classes = [BradleyTerryNewtonRaphsonPairedCompSubjectiveModel]

    _, _, results = run_subjective_models(
        dataset_filepath=dataset_filepath,
        subjective_model_classes=subjective_model_classes,
        dataset_reader_class=PairedCompDatasetReader,
        do_plot=[
            # 'raw_scores',
            'quality_scores',
            # 'subject_scores',
            # 'content_scores',
        ],
        plot_type='bar',
        show_dis_video_names=True
    )

    return results


# Example path:
# dataset_filepath = SurealConfig.resource_path('dataset', 'lukas_pc_dataset.py')

# For Txt2Vid Data:
# subjective_data_SUREAL = 'dataset_SUREAL.py'
subjective_data_SUREAL_folder = 'datasets_SUREAL'

subjective_model_classes = [
    # ThurstoneJingMlePairedCompSubjectiveModelPlain,
    # BradleyTerryWickelmaierSchmidPairedCompSubjectiveModel,
    # ThurstoneCaseVPairedCompSubjectiveModel,
    BradleyTerryNewtonRaphsonPairedCompSubjectiveModel,
    # BradleyTerryMlePairedCompSubjectiveModel,
    # ThurstoneMlePairedCompSubjectiveModel,
    # ThurstoneJingMlePairedCompSubjectiveModel,
]

num_contents = 6
plots_save_path = 'figures/SUREAL'
os.makedirs(plots_save_path, exist_ok=True)
results = {}

for content_id in range(1, 1 + num_contents):
    results[f'Content{content_id}'] = {}
    curr_content = f'Content{content_id}.py'
    dataset_filepath = os.path.join(subjective_data_SUREAL_folder, curr_content)

    visualize_pc_dataset(dataset_filepath)
    results[f'Content{content_id}'] = run_pc_subjective_models(dataset_filepath, subjective_model_classes)
    # DisplayConfig.show()
    plt.savefig(os.path.join(plots_save_path, f'Content{content_id}.pdf'),
                bbox_inches='tight')

results_dir = 'datasets_SUREAL'
quality_results_file = os.path.join(results_dir, 'BT_analysis.json')
with open(quality_results_file, 'w') as f:
    json.dump(results, f, indent=4)
