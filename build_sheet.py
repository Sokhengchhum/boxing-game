import cv2
import numpy as np
import os

def process_sheet(img_path, sheet_name):
    print("Processing", sheet_name)
    img = cv2.imread(img_path)
    if img is None: return
    
    # 1. Floodfill background
    mask = np.zeros((img.shape[0]+2, img.shape[1]+2), np.uint8)
    diff = (12, 12, 12)
    
    img_ff = img.copy()
    diffs = [(x,y) for x in [0, img.shape[1]//2, img.shape[1]-1] for y in [0, img.shape[0]//2, img.shape[0]-1]]
    for (x,y) in diffs:
        cv2.floodFill(img_ff, mask, (x, y), (255, 0, 255), diff, diff, cv2.FLOODFILL_FIXED_RANGE)
    
    # Create an RGBA image
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    
    # where mask is 1 (filled), set alpha to 0
    mask_inner = mask[1:-1, 1:-1]
    rgba[mask_inner == 1, 3] = 0
    
    # Now that the background is transparent, find bounding boxes of the remaining opaque pixels
    # Find contours on the alpha channel!
    alpha = rgba[:, :, 3]
    # small erosion to break connected noise
    kernel = np.ones((5,5), np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, kernel)
    
    contours, _ = cv2.findContours(alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bboxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w > 60 and h > 100:
            bboxes.append((x, y, w, h))
            
    # sort bboxes by Y then X
    bboxes.sort(key=lambda b: (b[1]//150, b[0]))
    
    print(f"Found {len(bboxes)} frames")
    
    # We want to create a unified strip.
    # Find max height
    if not bboxes: return
    max_h = max(h for _, _, _, h in bboxes)
    # Target frame size, maybe max_w + 20 and max_h + 20
    # Let's align them to the bottom so their feet stay on the ground
    frame_w = max(w for _, _, w, _ in bboxes) + 40
    frame_h = max_h + 20
    
    # Create empty strip
    strip = np.zeros((frame_h, frame_w * len(bboxes), 4), dtype=np.uint8)
    
    for i, (x, y, w, h) in enumerate(bboxes):
        sprite = rgba[y:y+h, x:x+w]
        
        # calculate bottom-center alignment
        dst_x = i * frame_w + (frame_w - w) // 2
        dst_y = frame_h - h - 10 # 10px padding at bottom
        
        strip[dst_y:dst_y+h, dst_x:dst_x+w] = sprite
        
    cv2.imwrite(f"img/{sheet_name}.png", strip)
    print(f"Saved img/{sheet_name}.png ({strip.shape[1]}x{strip.shape[0]})")

process_sheet(r'C:\Users\ASUS\.gemini\antigravity\brain\61d3bafa-bd6d-4ef9-93f6-8efd706cb36f\media__1775466529120.jpg', 'barrera_sheet')
# process_sheet(r'C:\Users\ASUS\.gemini\antigravity\brain\61d3bafa-bd6d-4ef9-93f6-8efd706cb36f\media__1775466529154.jpg', 'others_sheet')
