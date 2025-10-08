import cv2
import numpy as np

def embed_dct(qr_img, wm_img, alpha=0.05):
    """
    Embed an image watermark into a QR code using DCT.
    qr_img : grayscale QR image (numpy array)
    wm_img : watermark image (numpy array, smaller than QR)
    alpha  : embedding strength
    """
    qr = np.float32(qr_img)
    wm_resized = cv2.resize(wm_img, (qr.shape[1] // 4, qr.shape[0] // 4))

    # Apply DCT to QR code
    dct_qr = cv2.dct(qr)

    # Embed watermark in top-left block
    dct_qr[0:wm_resized.shape[0], 0:wm_resized.shape[1]] += alpha * wm_resized

    # Inverse DCT to get watermarked QR
    qr_wm = cv2.idct(dct_qr)
    qr_wm = np.uint8(np.clip(qr_wm, 0, 255))
    return qr_wm

def extract_dct(qr_img, block_size=None):
    """
    Extract an image watermark from a QR code using DCT.
    qr_img : grayscale QR image (numpy array)
    block_size : tuple (height, width) of the watermark block
    """
    qr = np.float32(qr_img)
    dct_qr = cv2.dct(qr)

    if block_size is None:
        h, w = qr.shape[0] // 4, qr.shape[1] // 4
    else:
        h, w = block_size

    wm_extracted = dct_qr[0:h, 0:w]
    wm_extracted = cv2.normalize(wm_extracted, None, 0, 255, cv2.NORM_MINMAX)
    return np.uint8(wm_extracted)
