#!/usr/bin/env python3
"""Composite 20 unique LPC-style pixel art portraits from the OpenGameArt portrait kit."""
from PIL import Image
import os
import random

SRC = "/tmp/portrait_extract/Portrait"
OUT = "/Users/warrenjthompson/Source/spinner-sync/public/portraits"
os.makedirs(OUT, exist_ok=True)

random.seed(42)

# Only use human-looking skin tones (skip darkelf which looks grey/alien)
skin_tones = ['light', 'tanned', 'tanned2', 'dark', 'dark2']

hair_styles = [
    'princess', 'long', 'loose', 'braid', 'curly', 'ponytail', 'ponytail2',
    'bunches', 'xlong', 'shoulderl', 'shoulderr', 'bangslong', 'bangslong2',
    'page', 'swoop', 'single', 'parted'
]

hair_colors = [
    'blonde', 'blonde2', 'brown', 'brunette', 'red', 'pink', 'purple',
    'blue', 'blue2', 'green', 'cyan', 'raven', 'gold', 'lightblonde',
    'darkred', 'ruby', 'black'
]

backgrounds = [
    'bg_circle_pink.png', 'bg_circle_cyan.png', 'bg_circle_yellow.png',
    'bg_circle_green.png', 'bg_circle_blue.png',
    'bg_circle1_pink.png', 'bg_circle1_cyan.png',
    'bg_circle1_yellow.png', 'bg_circle1_green.png', 'bg_circle1_blue.png',
]

def load_layer(path, size=(64, 64)):
    """Load a PNG layer and resize if needed."""
    if not os.path.exists(path):
        return None
    layer = Image.open(path).convert("RGBA")
    if layer.size != size:
        layer = layer.resize(size, Image.NEAREST)
    return layer

def composite(base, layer):
    """Alpha composite a layer onto base."""
    if layer:
        return Image.alpha_composite(base, layer)
    return base

for i in range(20):
    skin = random.choice(skin_tones)
    style = random.choice(hair_styles)
    color = random.choice(hair_colors)
    bg_name = random.choice(backgrounds)
    nose_type = random.choice(['nose_button', 'nose_normal', 'nose_straight'])
    has_earring = random.random() < 0.25
    has_tiara = random.random() < 0.15

    # 1. Background
    portrait = load_layer(os.path.join(SRC, "Background", bg_name))
    if portrait is None:
        portrait = Image.new("RGBA", (64, 64), (200, 168, 120, 255))

    # 2. Base body + face (has open eyes built in)
    portrait = composite(portrait, load_layer(os.path.join(SRC, "Base", f"base_{skin}.png")))

    # 3. Ears
    portrait = composite(portrait, load_layer(os.path.join(SRC, "Ears", skin, f"ears_{skin}.png")))

    # 4. Face features - DO NOT add eyes_closed or eyes_sadeye (base already has open eyes)
    face_dir = os.path.join(SRC, "Face", skin)

    # Eye detail lines (makes eyes more defined)
    portrait = composite(portrait, load_layer(os.path.join(face_dir, f"lines_eye_{skin}.png")))

    # Normal eyebrows
    portrait = composite(portrait, load_layer(os.path.join(face_dir, f"browbase_normal_{skin}.png")))

    # Nose
    portrait = composite(portrait, load_layer(os.path.join(face_dir, f"{nose_type}_{skin}.png")))

    # Smiling mouth
    mouth = load_layer(os.path.join(face_dir, f"mouth_normal_smile_{skin}.png"))
    if mouth is None:
        mouth = load_layer(os.path.join(face_dir, f"mouth_normal_{skin}.png"))
    portrait = composite(portrait, mouth)

    # Smile lines
    portrait = composite(portrait, load_layer(os.path.join(face_dir, f"lines_mouth-smile_{skin}.png")))

    # 5. Hair (on top of face)
    hair_path = os.path.join(SRC, "Hair", style, f"{style}_{color}.png")
    if not os.path.exists(hair_path):
        hair_path = os.path.join(SRC, "Hair", style, f"{style}_default.png")
    portrait = composite(portrait, load_layer(hair_path))

    # 6. Optional accessories
    if has_earring:
        earring = random.choice(['earring_gold.png', 'earring_silver.png'])
        portrait = composite(portrait, load_layer(os.path.join(SRC, "Accessory", earring)))

    if has_tiara:
        tiara = random.choice(['tiara_gold.png', 'tiara_silver.png', 'tiara_purple.png'])
        portrait = composite(portrait, load_layer(os.path.join(SRC, "Headwear", tiara)))

    # Save at 128x128 (2x upscale, crisp pixel art)
    portrait = portrait.resize((128, 128), Image.NEAREST)
    portrait.save(os.path.join(OUT, f"avatar_{i}.png"))
    print(f"avatar_{i}.png: {skin}, {style}_{color}")

print(f"\nDone! 20 portraits in {OUT}")
