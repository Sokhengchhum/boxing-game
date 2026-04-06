import cv2
import numpy as np
import os

img_path = r'C:\Users\ASUS\.gemini\antigravity\brain\61d3bafa-bd6d-4ef9-93f6-8efd706cb36f\media__1775466529120.jpg'
img = cv2.imread(img_path)
if img is not None:
    print("Image loaded:", img.shape)
    
    # 1. Grab corners (which should be background checkerboard)
    bg1 = img[10, 10]
    bg2 = img[10, 20]
    bg3 = img[20, 10]
    print("Corner colors:", bg1, bg2, bg3)
    
    # 2. We can try to use floodFill from corners
    mask = np.zeros((img.shape[0]+2, img.shape[1]+2), np.uint8)
    diff = (10, 10, 10)
    
    # Floodfill from a few background spots
    img_ff = img.copy()
    cv2.floodFill(img_ff, mask, (0, 0), (255, 0, 255), diff, diff, cv2.FLOODFILL_FIXED_RANGE)
    cv2.floodFill(img_ff, mask, (img.shape[1]-1, 0), (255, 0, 255), diff, diff, cv2.FLOODFILL_FIXED_RANGE)
    cv2.floodFill(img_ff, mask, (0, img.shape[0]-1), (255, 0, 255), diff, diff, cv2.FLOODFILL_FIXED_RANGE)
    cv2.floodFill(img_ff, mask, (img.shape[1]-1, img.shape[0]-1), (255, 0, 255), diff, diff, cv2.FLOODFILL_FIXED_RANGE)
    
    # Create an RGBA image
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    
    # where mask is 1 (filled), set alpha to 0
    mask_inner = mask[1:-1, 1:-1]
    rgba[mask_inner == 1, 3] = 0
    
    cv2.imwrite('img/floodfill_test.png', rgba)
    print("Saved floodfill_test.png")
