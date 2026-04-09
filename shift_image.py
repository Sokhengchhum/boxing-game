import sys
import os
import cv2
import numpy as np

def shift_image(img_path, shift_x, shift_y=0):
    if not os.path.exists(img_path):
        print(f"Error: '{img_path}' not found!")
        sys.exit(1)
        
    img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"Error: Could not read '{img_path}'.")
        sys.exit(1)
        
    h, w = img.shape[:2]
    
    # Create transformation matrix
    M = np.float32([[1, 0, shift_x], [0, 1, shift_y]])
    
    # Apply affine transformation. The border mode transparent handles alphachannel
    shifted_img = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))
    
    # Save it back
    cv2.imwrite(img_path, shifted_img)
    print(f"Successfully shifted '{img_path}' by X:{shift_x}, Y:{shift_y}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python shift_image.py <path_to_png> <move_x_pixels> [move_y_pixels]")
        print("Example (move punch right by 10 pixels): python shift_image.py img/lee/punch.png 10")
        print("Example (move punch left by 5 pixels): python shift_image.py img/lee/punch.png -5")
        sys.exit(1)
        
    path = sys.argv[1]
    dx = int(sys.argv[2])
    dy = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    
    shift_image(path, dx, dy)
