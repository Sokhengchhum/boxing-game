import cv2
import numpy as np
import os

def extract_sprites(img_path, out_prefix):
    print(f"Processing {img_path}")
    img = cv2.imread(img_path)
    if img is None:
        print(f"Failed to load {img_path}")
        return
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Try to find the checkerboard pattern and isolate the character
    # The character is much more colorful and has different intensity
    # Let's apply a morphological gradient
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    grad = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel)
    
    _, thresh = cv2.threshold(grad, 15, 255, cv2.THRESH_BINARY)
    
    # Dilate to connect components
    thresh = cv2.dilate(thresh, kernel, iterations=3)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    idx = 0
    bboxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w > 50 and h > 60:
            bboxes.append((x, y, w, h))
            
    # Sort boxes top-to-bottom, left-to-right
    bboxes.sort(key=lambda b: (b[1]//150, b[0]))
    
    print(f"Found {len(bboxes)} sprites in {out_prefix}")
    
    for i, (x, y, w, h) in enumerate(bboxes):
        sprite = img[y:y+h, x:x+w]
        cv2.imwrite(f"{out_prefix}_{i}.png", sprite)
        print(f"Saved {out_prefix}_{i}.png")

os.makedirs('img', exist_ok=True)
extract_sprites(r'C:\Users\ASUS\.gemini\antigravity\brain\61d3bafa-bd6d-4ef9-93f6-8efd706cb36f\media__1775466529120.jpg', r'img\barrera_frame')
extract_sprites(r'C:\Users\ASUS\.gemini\antigravity\brain\61d3bafa-bd6d-4ef9-93f6-8efd706cb36f\media__1775466529154.jpg', r'img\sheet2')
