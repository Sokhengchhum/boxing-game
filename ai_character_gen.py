import os
import sys
import time
import io
import numpy as np
from PIL import Image

try:
    from huggingface_hub import InferenceClient
except ImportError:
    print("Missing 'huggingface_hub' library. Please run: pip install huggingface_hub")
    sys.exit(1)

def remove_background(image):
    """
    Primitive background removal based on color thresholding.
    Assuming we prompted for a 'flat white background'.
    """
    img = image.convert("RGBA")
    data = np.array(img)
    
    # Target "white-ish" background removal
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Tolerance for "white"
    threshold = 240
    mask = (r > threshold) & (g > threshold) & (b > threshold)
    data[:,:,3][mask] = 0
    
    return Image.fromarray(data)

def generate_fighter_frames(name, description, token):
    # Initialize the modern InferenceClient (handles routing/retries automatically)
    client = InferenceClient("runwayml/stable-diffusion-v1-5", token=token)
    
    out_dir = os.path.join("img", name)
    os.makedirs(out_dir, exist_ok=True)
    
    # Robust Style Prompting for Pixel Art consistency
    style_suffix = "pixel art style, 16-bit arcade sprite, full body character, centered, standing on flat ground, isolated on solid white background, high contrast, clean edges"
    neg_prompt = "background, environment, scenery, floor, shadow, blurry, low res, artifact, text, signature, watermark, multiple people, messy edges"
    
    actions = {
        "idle": f"standing in a classic boxing guard stance, looking forward, {style_suffix}",
        "walk": f"walking animation frame, walking past the camera, {style_suffix}",
        "jab": f"throwing a fast left jab punch, lead arm fully extended straight, {style_suffix}",
        "cross": f"throwing a power right cross punch, body rotated, rear heel lifted, {style_suffix}",
        "hook": f"throwing a lead hook punch, elbow bent 90 degrees, horizontal swing, {style_suffix}",
        "uppercut": f"throwing a rising uppercut punch, hand coming from below the chin, {style_suffix}",
        "overhand": f"throwing a looping overhead punch, curving trajectory, {style_suffix}",
        "body": f"crouching slightly, throwing a punch to the midsection/stomach, {style_suffix}",
        "dash": f"lunging forward explosively with a punch, dynamic pose, {style_suffix}",
        "kick": f"performing a high kick, leg extended high toward head height, {style_suffix}",
        "super": f"unleashing a devastating super punch, glowing with golden energy, {style_suffix}",
        "block": f"holding both gloves up in a tight defensive shell, guarding face, {style_suffix}",
        "duck": f"crouching low to the ground to avoid a head hit, {style_suffix}",
        "slip": f"leaning upper body to the side to avoid a straight punch, {style_suffix}",
        "hurt": f"recoiling from being hit, head snapped back, look of pain, {style_suffix}",
        "ko": f"falling backwards, knocked out, eyes closed, body limp, {style_suffix}",
        "punch": f"generic extension of a boxing punch, {style_suffix}",
        "lunge": f"lunging forward stance, weight committed to front leg, {style_suffix}",
        "combo": f"executing a rapid flurry of punches, multiple arms visible with motion blur, {style_suffix}"
    }

    for i in range(1, 7):
        actions[f"walk{i}"] = f"walking animation frame {i} of 6, dynamic leg movement, {style_suffix}"

    print(f"\n============================================")
    print(f"🥊 AI CHARACTER FRAME GENERATOR 🥊")
    print(f"============================================\n")
    print(f"Character: {name.upper()}")
    print(f"Base Desc: {description}")
    print(f"Output Dir: {out_dir}\n")

    for action, specific_prompt in actions.items():
        filename = f"{action}.png"
        filepath = os.path.join(out_dir, filename)
        
        if os.path.exists(filepath):
            print(f"[-] {filename} already exists. Skipping.")
            continue
            
        full_prompt = f"{description}, {specific_prompt}"
        print(f"[...] Generating {action:12} ", end="", flush=True)
        
        try:
            # client.text_to_image handles the API calls and endpoint routing
            image = client.text_to_image(
                full_prompt, 
                negative_prompt=neg_prompt,
                guidance_scale=7.5,
                num_inference_steps=35
            )
            
            final_img = remove_background(image)
            final_img.save(filepath)
            print(f"✅ Success!")
            
            # Short sleep to be polite to the API
            time.sleep(4)
            
        except Exception as e:
            print(f"❌ Failed: {e}")
            if "Model too busy" in str(e) or "503" in str(e):
                print("   (Model is currently loading or busy on the server, please wait and retry)")
            time.sleep(10)

    print(f"\nDone! Processed all frames for '{name}'.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("\nUsage: python ai_character_gen.py <name> <description> [token]")
        sys.exit(1)
        
    name_arg = sys.argv[1].lower().replace(" ", "_")
    desc_arg = sys.argv[2]
    token_arg = sys.argv[3] if len(sys.argv) > 3 else os.getenv("HF_TOKEN")
    
    if not token_arg:
        print("\n[!] Error: No Hugging Face token found.")
        sys.exit(1)
        
    generate_fighter_frames(name_arg, desc_arg, token_arg)
