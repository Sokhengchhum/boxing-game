import sys
import os
import cv2
import numpy as np

def remove_background(img):
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        
    # Check if top-left corner is already transparent
    if img[0, 0, 3] == 0:
        return img 
        
    # Get the background color from top-left
    bg_color = img[0, 0]
    
    # Simple color thresholding (allow small variance for artifacts)
    tolerance = 15
    lower = np.array([max(0, int(c) - tolerance) for c in bg_color[:3]] + [255])
    upper = np.array([min(255, int(c) + tolerance) for c in bg_color[:3]] + [255])
    
    # Find matching pixels
    color_mask = cv2.inRange(img, lower, upper)
    
    # Make them transparent
    img[color_mask > 0] = [0, 0, 0, 0]

    return img

def fix_split(boxer_name):
    sheet_path = os.path.join("img", f"{boxer_name}.png")
    out_dir = os.path.join("img", boxer_name)
    os.makedirs(out_dir, exist_ok=True)
    
    img = cv2.imread(sheet_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Error: Could not read image.")
        return
        
    # Convert to BGRA before splitting
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        
    h, w = img.shape[:2]
    
    print(f"Applying advanced slicing & background removal for {boxer_name}...")

    # Detect Layout Automatically
    # A 4x4 grid has an aspect ratio around 1:1. A 6x1 strip is 6:1.
    is_grid = (w / h) < 2.0
    
    if is_grid:
        cols = 4
        rows = 4
        frame_w = w // cols
        frame_h = h // rows
        # The exact 15 frames the user requested
        actions = [
            "idle", "walk", "dash", "jab", "cross", "hook", "uppercut", "super", 
            "block", "duck", "slip", "hurt", "ko", "punch", "lunge"
        ]
        
        for i, action in enumerate(actions):
            col = i % cols
            row = i // cols
            
            start_x = col * frame_w
            end_x = (col + 1) * frame_w
            start_y = row * frame_h
            end_y = (row + 1) * frame_h
            
            frame_img = img[start_y:end_y, start_x:end_x].copy()
            frame_img = remove_background(frame_img)
            
            out_file = os.path.join(out_dir, f"{action}.png")
            cv2.imwrite(out_file, frame_img)
            print(f" -> Processed & Saved: {out_file}")
            
    else:
        frame_w = w // 6
        actions = ["punch", "idle", "block", "lunge", "duck", "hurt"]
        
        for i, action in enumerate(actions):
            start_x = i * frame_w
            end_x = (i + 1) * frame_w
            
            # Specific fixes
            if boxer_name.startswith("jackson"):
                if i == 0: end_x += 35
                if i == 1: start_x += 35
                
            frame_img = img[0:h, start_x:end_x].copy()
            
            # Remove Background
            frame_img = remove_background(frame_img)
            
            out_file = os.path.join(out_dir, f"{action}.png")
            cv2.imwrite(out_file, frame_img)
            print(f" -> Processed & Saved: {out_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Pass the boxer name.")
        sys.exit(1)
    fix_split(sys.argv[1])
