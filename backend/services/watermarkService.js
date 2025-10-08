const { spawn } = require("child_process");
const path = require("path");

const pythonScript = path.join(__dirname, "../../watermarking/watermark.py");

/**
 * Embed watermark into QR code
 * @param {string} inputPath - Path to original QR code image
 * @param {string} outputPath - Path where watermarked QR will be saved
 * @param {string} watermarkText - The watermark text to embed
 * @returns {Promise<string>}
 */
function embedWatermark(inputPath, outputPath, watermarkText) {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [
      pythonScript,
      "embed",
      inputPath,
      outputPath,
      watermarkText,
    ]);

    let result = "";
    let error = "";

    py.stdout.on("data", (data) => {
      result += data.toString();
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.on("close", (code) => {
      if (code === 0) {
        resolve(result.trim());
      } else {
        reject(new Error(error || "Watermark embedding failed"));
      }
    });
  });
}

/**
 * Extract watermark from QR code
 * @param {string} inputPath - Path to watermarked QR code image
 * @returns {Promise<Object>}
 */
function extractWatermark(inputPath) {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [pythonScript, "extract", inputPath]);

    let result = "";
    let error = "";

    py.stdout.on("data", (data) => {
      result += data.toString();
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.on("close", (code) => {
      if (code === 0) {
        try {
          // Python prints dictionary-like output, parse to JSON if possible
          if (result.includes("{")) {
            const jsonPart = result.substring(result.indexOf("{"));
            resolve(JSON.parse(jsonPart.replace(/'/g, '"')));
          } else {
            resolve({ output: result.trim() });
          }
        } catch (e) {
          reject(new Error("Failed to parse watermark output: " + result));
        }
      } else {
        reject(new Error(error || "Watermark extraction failed"));
      }
    });
  });
}

module.exports = { embedWatermark, extractWatermark };
