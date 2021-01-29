## To run the code: 

1. `cd image_animation`

2. `pip install -r requirement_imgAnimation.txt`

3. `python image_animation.py  --config config/vox-256.yaml --driving_video movement_video.mp4 --source_image ../sample_data/still_image.png --result_video ../sample_data/animated_image.mp4 --checkpoint checkpoint_imgAnimation/vox-cpk.pth.tar`

4. `cd ..` 

5. Lip sync based on the animated image (with head/eyes movements) and audio. 

## References

1. [First order model](https://github.com/AliaksandrSiarohin/first-order-model). 
