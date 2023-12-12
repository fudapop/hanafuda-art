import os
import subprocess

PROJECTS_DIR = "C://Users/alhlv/Documents/Projects"
cwebp = f"{PROJECTS_DIR}/libwebp-1.3.0-windows-x64/bin/cwebp.exe"

# Specify original format
orig_ext = "png"

# Define directory with files to convert
WORKING_DIR = f"{PROJECTS_DIR}/lp-koikoi/public/cards/parish-cherry"

# Define output directory for converted files
OUTPUT_DIR = f"{WORKING_DIR}/{orig_ext}"

os.chdir(WORKING_DIR)
for filename in os.listdir(f'{WORKING_DIR}/{orig_ext}'):
    new_filename = f'{filename[:-4]}.webp'
    # print(new_filename)
    subprocess.call([cwebp, '-q', '100', f'{orig_ext}/{filename}', '-o', f'webp/{new_filename}', '-resize', '120', '0'])
