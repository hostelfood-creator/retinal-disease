import kagglehub
import shutil
import os

print("Downloading the APTOS 2019 dataset...")
path = kagglehub.dataset_download("mariaherrerot/aptos2019")
print("Downloaded dataset to:", path)

# move the downloaded files to a local directory for easier access
local_dir = os.path.join(os.path.dirname(__file__), "dataset")
if not os.path.exists(local_dir):
    os.makedirs(local_dir)

print(f"Moving contents from {path} to {local_dir}")
for item in os.listdir(path):
    s = os.path.join(path, item)
    d = os.path.join(local_dir, item)
    if os.path.isdir(s):
        if not os.path.exists(d):
            shutil.copytree(s, d)
    else:
        if not os.path.exists(d):
            shutil.copy2(s, d)
            
print("Dataset is ready in the 'dataset' folder!")
