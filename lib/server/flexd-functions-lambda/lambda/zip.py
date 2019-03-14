import os
import zipfile
import sys

def zipdir(ziph):
    # ziph is zipfile handle
    for root, dirs, files in os.walk('./'):
        for file in files:
            relative_path = os.path.join(root, file)
            if relative_path != './package.zip':
                ziph.write(os.path.join(root, file))

if __name__ == '__main__':
    zipf = zipfile.ZipFile('./package.zip', 'w', zipfile.ZIP_DEFLATED)
    zipdir(zipf)
    zipf.close()
