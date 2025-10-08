# utils/svd_utils.py
import numpy as np
import cv2
import os

S_FILE = "watermarking/outputs/original_singular_values.npy"

def embed_svd(qr_dct, wm, alpha=0.05):
    U, S, Vt = np.linalg.svd(qr_dct)
    # save original singular values
    np.save(S_FILE, S)

    # embed watermark into singular values
    wm_flat = cv2.resize(wm, (len(S), 1)).flatten()
    S_mod = S + alpha * wm_flat

    # reconstruct image
    qr_wm = np.dot(U, np.dot(np.diag(S_mod), Vt))
    return qr_wm

def extract_svd(qr_img, alpha=0.05):
    if not os.path.exists(S_FILE):
        raise ValueError("Original singular values file not found")

    S_original = np.load(S_FILE)
    U, S, Vt = np.linalg.svd(qr_img)

    wm_est = (S - S_original) / alpha
    wm_est = np.clip(wm_est, 0, 255).astype(np.uint8)

    # reshape watermark back to approximate size
    side = int(np.sqrt(len(wm_est)))
    wm_est_img = wm_est[:side*side].reshape(side, side)
    return wm_est_img
