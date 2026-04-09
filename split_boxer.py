import sys
import os
import cv2

def split_sprite_sheet(boxer_name):
    # Paths
    sheet_path = os.path.join("img", f"{boxer_name}.png")
    out_dir = os.path.join("img", boxer_name)
    
    if not os.path.exists(sheet_path):
        print(f"Error: Sprite sheet '{sheet_path}' not found!")
        sys.exit(1)
        
    os.makedirs(out_dir, exist_ok=True)
    
    print(f"Loading '{sheet_path}' for boxer '{boxer_name}'...")
    img = cv2.imread(sheet_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"Error: Could not read '{sheet_path}'.")
        sys.exit(1)
        
    h, w = img.shape[:2]
    # The sheet is exactly 6 frames wide
    frame_w = w // 6
    
    # 6 Actions in exact order: 
    # [0: punch, 1: idle, 2: block, 3: lunge, 4: duck, 5: hurt]
    actions = ["punch", "idle", "block", "lunge", "duck", "hurt"]
    
    for i, action in enumerate(actions):
        start_x = i * frame_w
        end_x = start_x + frame_w
        # Crop frame
        frame_img = img[0:h, start_x:end_x]
        
        out_file = os.path.join(out_dir, f"{action}.png")
        cv2.imwrite(out_file, frame_img)
        print(f" -> Created {out_file}")
        
    print(f"\nSuccess! 6 action frames generated in 'img/{boxer_name}/'.")
    print("The game engine will automatically detect and load these during the fight!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python split_boxer.py <boxer_name>")
        print("Example: python split_boxer.py lee")
        sys.exit(1)
        
    split_sprite_sheet(sys.argv[1])
