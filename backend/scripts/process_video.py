#!/usr/bin/env python3
"""
process_video.py — converts a raw lesson video into encrypted, segmented
HLS, ready to be served to students through the protected VideoPlayer.

Pipeline:
  1. FFmpeg transcodes the source video into an unencrypted HLS
     stream (.m3u8 + .ts segments).
  2. Shaka Packager re-packages those segments with AES-128 encryption,
     producing the final playlist + a `.key`/`.keyinfo` file.
  3. The resulting folder is what you point a lesson's `content_url` at
     (e.g. via the Django Admin panel or the teacher `content_url` field).

Prerequisites (must be installed and on PATH):
  - ffmpeg        https://ffmpeg.org
  - packager      https://github.com/shaka-project/shaka-packager

Usage:
  python scripts/process_video.py raw_lesson1.mp4 media/lessons/lesson1

This does NOT wire the encryption key into your Django JWT token flow
automatically — see the notes at the bottom of this file for that step.
"""

import argparse
import secrets
import subprocess
import sys
from pathlib import Path


def run(cmd, **kwargs):
    print(f"$ {' '.join(cmd)}")
    subprocess.run(cmd, check=True, **kwargs)


def transcode_to_hls(source: Path, work_dir: Path):
    """Step 1: FFmpeg -> unencrypted HLS segments."""
    work_dir.mkdir(parents=True, exist_ok=True)
    playlist = work_dir / "unencrypted.m3u8"
    run([
        "ffmpeg", "-i", str(source),
        "-codec:", "copy",           # re-encode instead with -c:v libx264 -c:a aac if source isn't already web-friendly
        "-start_number", "0",
        "-hls_time", "6",            # 6-second segments — shorter = finer-grained access control, more files
        "-hls_list_size", "0",
        "-f", "hls",
        str(playlist),
    ])
    return playlist


def encrypt_with_shaka(playlist: Path, output_dir: Path):
    """Step 2: Shaka Packager -> AES-128 encrypted HLS + key."""
    output_dir.mkdir(parents=True, exist_ok=True)
    key = secrets.token_hex(16)       # 128-bit key, hex-encoded
    key_id = secrets.token_hex(16)

    encrypted_playlist = output_dir / "index.m3u8"

    run([
        "packager",
        f"in={playlist},stream=video,segment_template={output_dir}/seg_$Number$.ts,"
        f"playlist_name={encrypted_playlist},hls_group_id=default,hls_name=VIDEO",
        "--enable_raw_key_encryption",
        "--keys", f"key_id={key_id}:key={key}",
        "--hls_master_playlist_output", str(output_dir / "master.m3u8"),
    ])

    # Save the key somewhere your key-serving endpoint can read it —
    # never commit this file or serve it publicly.
    (output_dir / "key.txt").write_text(f"key_id={key_id}\nkey={key}\n")

    print(f"\nDone. Point the lesson's content_url at: {output_dir / 'master.m3u8'}")
    print(f"Key material saved to: {output_dir / 'key.txt'} (keep this server-side only)")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="Path to the raw lesson video file")
    parser.add_argument("output_dir", help="Output folder, e.g. media/lessons/lesson1")
    args = parser.parse_args()

    source = Path(args.source)
    if not source.exists():
        print(f"Source file not found: {source}", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output_dir)
    work_dir = output_dir / "_tmp_unencrypted"

    playlist = transcode_to_hls(source, work_dir)
    encrypt_with_shaka(playlist, output_dir)


if __name__ == "__main__":
    main()

# ─────────────────────────────────────────────────────────────────────
# NOTE on wiring the key into the JWT flow (next step, not automated
# here): today, `VideoTokenVerifyView` in courses/views.py just checks
# that the student is allowed to watch. To fully enforce encryption,
# your nginx config (or a small key-server view) should read key.txt
# for the requested lesson and only return it if VideoTokenVerifyView
# says the token is valid. This keeps the actual decryption key off the
# client until the very last, permission-checked moment.
# ─────────────────────────────────────────────────────────────────────
