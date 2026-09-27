const { spawn } = require("child_process");
const path = require("path");

// Keeps scripts/process_video.py as-is (Python + FFmpeg + Shaka Packager) and
// shells out to it, per the decision to leave the video pipeline in Python
// since it only runs at upload time, not per-request. Returns the paths to
// the encrypted HLS segments + key file the script produces.
function processVideo(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "..", "scripts", "process_video.py");
    const proc = spawn("python3", [script, inputPath, outputDir]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve({ outputDir });
      else reject(new Error(`process_video.py exited ${code}: ${stderr}`));
    });
  });
}

module.exports = { processVideo };
