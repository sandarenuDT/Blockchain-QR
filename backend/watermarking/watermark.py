import cv2
import numpy as np
import sys
from utils.dct_utils import embed_dct, extract_dct
from utils.svd_utils import embed_svd, extract_svd
from utils.sift_utils import align_image
from skimage.metrics import structural_similarity as ssim
import os



# def embed_watermark(input_path, output_path, watermark_img_path):
#     """Embed watermark into a QR code using DCT + SVD."""
#     print("🔎 Debug: Trying to load images...")
#     print("QR path:", input_path, " -> ", cv2.imread(input_path) is not None)
#     print("WM path:", watermark_img_path, " -> ", cv2.imread(watermark_img_path) is not None)

#     qr = cv2.imread(input_path, cv2.IMREAD_GRAYSCALE)
#     wm = cv2.imread(watermark_img_path, cv2.IMREAD_GRAYSCALE)
#     if qr is None or wm is None:
#         raise ValueError("QR code or watermark not found!")

#     # Resize watermark smaller than QR
#     wm_resized = cv2.resize(wm, (qr.shape[1] // 4, qr.shape[0] // 4))

#     # Embed watermark using DCT
#     qr_dct = embed_dct(qr, wm_resized)

#     # Strengthen watermark using SVD
#     qr_wm = embed_svd(qr_dct, wm_resized)

#     # Save the watermarked QR
#     cv2.imwrite(output_path, qr_wm)
#     print(f"✅ Watermarked QR saved at {output_path}")

def embed_dct_svd(cover_img, watermark, alpha=0.05):
    # Convert to float
    cover = np.float32(cover_img)
    watermark = cv2.resize(watermark, (cover.shape[1], cover.shape[0]))
    watermark = np.float32(watermark)

    # Step 1: Apply DCT
    dct_cover = cv2.dct(cover)

    # Step 2: Apply SVD
    U, S, V = np.linalg.svd(dct_cover)

    # Step 3: Modify singular values
    S_new = S + alpha * watermark

    # Step 4: Reconstruct watermarked DCT
    dct_watermarked = np.dot(U, np.dot(np.diag(S_new), V))

    # Step 5: Inverse DCT
    watermarked_image = cv2.idct(dct_watermarked)
    return np.uint8(np.clip(watermarked_image, 0, 255))


# def extract_watermark(input_path):
#     """Extract watermark from QR code using DCT + SVD."""
#     qr = cv2.imread(input_path, cv2.IMREAD_GRAYSCALE)
#     if qr is None:
#         raise ValueError("QR code not found!")

#     # Step 1: Align QR if rotated/scaled (robustness)
#     qr_aligned = align_image(qr)

#     # Step 2: Extract watermark
#     dct_wm = extract_dct(qr_aligned)
#     svd_wm = extract_svd(qr_aligned)

#     return {
#         "dct_watermark": dct_wm,
#         "svd_watermark": svd_wm
#     }
def extract_dct_svd(original_img, watermarked_img, alpha=0.05):
    # Convert to float
    orig_dct = cv2.dct(np.float32(original_img))
    wm_dct = cv2.dct(np.float32(watermarked_img))

    # Apply SVD
    Uo, So, Vo = np.linalg.svd(orig_dct)
    Uw, Sw, Vw = np.linalg.svd(wm_dct)

    # Extract watermark
    extracted = (Sw - So) / alpha
    return np.uint8(np.clip(extracted, 0, 255))



def verify_watermark(original_wm_path, extracted_wm):
    """Verify if extracted watermark matches original watermark."""
    orig = cv2.imread(original_wm_path, cv2.IMREAD_GRAYSCALE)
    if orig is None:
        raise ValueError("Original watermark not found!")

    # Resize original to match extracted watermark
    orig_resized = cv2.resize(orig, (extracted_wm.shape[1], extracted_wm.shape[0]))

    # ✅ Preprocessing: threshold + normalize
    _, orig_resized = cv2.threshold(orig_resized, 127, 255, cv2.THRESH_BINARY)
    _, extracted_wm = cv2.threshold(extracted_wm, 127, 255, cv2.THRESH_BINARY)

    orig_resized = orig_resized.astype(np.float32) / 255.0
    extracted_wm = extracted_wm.astype(np.float32) / 255.0

# Compute similarity with data_range
    score, _ = ssim(orig_resized, extracted_wm, full=True, data_range=1.0)

    print(f"🔎 SSIM Similarity Score: {score:.4f}")

    if score > 0.7:  # lowered threshold for robustness
        print("✅ Watermark Verified: Matches Original")
    else:
        print("❌ Watermark does NOT match")

    if score > 0.9:
        print("✅ Watermark Verified: Matches Original")
    else:
        print("❌ Watermark does NOT match")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print("  Embed:   python watermark.py embed <input_qr> <output_qr> <watermark_image>")
        print("  Extract: python watermark.py extract <input_qr>")
        sys.exit(1)

    mode = sys.argv[1]

    if mode == "embed":
        if len(sys.argv) != 5:
            print("❌ Wrong arguments for embed mode")
            print("Usage: python watermark.py embed <input_qr> <output_qr> <watermark_image>")
            sys.exit(1)
        _, _, input_path, output_path, watermark_img_path = sys.argv
        embed_watermark(input_path, output_path, watermark_img_path)

    elif mode == "extract":
        if len(sys.argv) != 3:
            print("❌ Wrong arguments for extract mode")
            print("Usage: python watermark.py extract <input_qr>")
            sys.exit(1)
        _, _, input_path = sys.argv
        wm = extract_watermark(input_path)
        print("🔍 Extracted Watermarks available (DCT & SVD).")
        # print(original_wm_path)

         # verify using SVD watermark
        original_wm_path = "watermarks/download.jpg"
        verify_watermark(original_wm_path, wm["svd_watermark"])
    else:
        print("❌ Invalid mode. Use 'embed' or 'extract'.")
