import torch
import rembg
import numpy as np
from PIL import Image
import trimesh
from tsr.system import TSR
from tsr.utils import remove_background, resize_foreground

# 1. Load TripoSR model locally (runs on MPS/CPU)
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Loading TripoSR model on device: {device}...")

model = TSR.from_pretrained(
    "stabilityai/TripoSR",
    config_name="config.yaml",
    weights_name="model.ckpt"
)
model.to(device)

# 2. Load and pre-process your character image
image_path = "shaivik-idle.png" # Place your image in the Backend folder or provide full path
input_image = Image.open(image_path)

print("Removing background from character image...")
rem_bg_image = remove_background(input_image, rembg.new_session())
processed_image = resize_foreground(rem_bg_image, 0.85)

# 3. Generate 3D mesh
print("Generating 3D mesh (this will take a moment on Mac M2)...")
with torch.no_grad():
    scene_codes = model([processed_image], device=device)
    meshes = model.extract_mesh(scene_codes, resolution=256)

# 4. Export to GLB format
output_glb_path = "shaivik_character.glb"
meshes[0].export(output_glb_path)

print(f"Success! 3D model exported as GLB: {output_glb_path}")