import sys

sys.path.append('sureal')

from sureal.config import SurealConfig, DisplayConfig
from sureal.routine import run_subjective_models, visualize_pc_dataset
from sureal.pc_subjective_model import BradleyTerryNewtonRaphsonPairedCompSubjectiveModel, \
    BradleyTerryMlePairedCompSubjectiveModel, ThurstoneMlePairedCompSubjectiveModel
from sureal.dataset_reader import PairedCompDatasetReader

def run_pc_subjective_models(dataset_filepath, subjective_model_classes=None):
    if subjective_model_classes is None:
        subjective_model_classes = [BradleyTerryNewtonRaphsonPairedCompSubjectiveModel]

    run_subjective_models(
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
    )


# Example path:
# dataset_filepath = SurealConfig.resource_path('dataset', 'lukas_pc_dataset.py')

# For Txt2Vid Data:
subjective_data_SUREAL = 'dataset_SUREAL.py'
dataset_filepath = subjective_data_SUREAL

subjective_model_classes = [
    # ThurstoneJingMlePairedCompSubjectiveModelPlain,
    # BradleyTerryWickelmaierSchmidPairedCompSubjectiveModel,
    # ThurstoneCaseVPairedCompSubjectiveModel,
    BradleyTerryNewtonRaphsonPairedCompSubjectiveModel,
    # BradleyTerryMlePairedCompSubjectiveModel,
    # ThurstoneMlePairedCompSubjectiveModel,
    # ThurstoneJingMlePairedCompSubjectiveModel,
]
visualize_pc_dataset(dataset_filepath)
run_pc_subjective_models(dataset_filepath, subjective_model_classes)
DisplayConfig.show()
