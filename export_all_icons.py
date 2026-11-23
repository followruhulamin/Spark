import os
import subprocess
from PIL import Image

def export_icons():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    master_path = os.path.join(base_dir, "master_icon.png")
    master = Image.open(master_path)
    
    # 1. Create iconset for macOS iconutil
    iconset_dir = os.path.join(base_dir, "icon.iconset")
    os.makedirs(iconset_dir, exist_ok=True)

    apple_sizes = [
        ("icon_16x16.png", 16),
        ("icon_16x16@2x.png", 32),
        ("icon_32x32.png", 32),
        ("icon_32x32@2x.png", 64),
        ("icon_128x128.png", 128),
        ("icon_128x128@2x.png", 256),
        ("icon_256x256.png", 256),
        ("icon_256x256@2x.png", 512),
        ("icon_512x512.png", 512),
        ("icon_512x512@2x.png", 1024),
    ]

    for fname, dim in apple_sizes:
        resized = master.resize((dim, dim), Image.Resampling.LANCZOS)
        resized.save(os.path.join(iconset_dir, fname), "PNG")
    print("Apple iconset generated.")

    # 2. Compile to icon.icns using macOS iconutil
    icns_path = os.path.join(base_dir, "src-tauri/icons/icon.icns")
    subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", icns_path], check=True)
    print("Compiled src-tauri/icons/icon.icns successfully.")

    # 3. Export Tauri standard PNG icons
    tauri_icons_dir = os.path.join(base_dir, "src-tauri/icons")
    
    # icon.png (1024x1024)
    master.save(os.path.join(tauri_icons_dir, "icon.png"), "PNG")
    
    # 32x32.png
    master.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, "32x32.png"), "PNG")
    
    # 64x64.png
    master.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, "64x64.png"), "PNG")

    # 128x128.png
    master.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, "128x128.png"), "PNG")
    
    # 128x128@2x.png (256x256)
    master.resize((256, 256), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, "128x128@2x.png"), "PNG")

    # Square logos
    square_sizes = [
        ("Square30x30Logo.png", 30),
        ("Square44x44Logo.png", 44),
        ("Square71x71Logo.png", 71),
        ("Square89x89Logo.png", 89),
        ("Square107x107Logo.png", 107),
        ("Square142x142Logo.png", 142),
        ("Square150x150Logo.png", 150),
        ("Square284x284Logo.png", 284),
        ("Square310x310Logo.png", 310),
        ("StoreLogo.png", 50),
    ]
    for fname, dim in square_sizes:
        master.resize((dim, dim), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, fname), "PNG")

    # 4. Generate Windows icon.ico
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master.save(os.path.join(tauri_icons_dir, "icon.ico"), format="ICO", sizes=ico_sizes)
    print("Exported all Tauri icon assets and icon.ico successfully.")

if __name__ == "__main__":
    export_icons()
