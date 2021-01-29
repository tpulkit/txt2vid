cd image_animation
pip install requirement_imgAnimation.txt
python image_animation.py  --config config/vox-256.yaml --driving_video movement_video.mp4 --source_image ../sample_data/still_image.png --result_video ../sample_data/animated_image.mp4 --checkpoint checkpoint_imgAnimation/vox-cpk.pth.tar

