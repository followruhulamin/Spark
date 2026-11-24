import os
import subprocess
import shutil
from PIL import Image
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_PATH = os.path.join(BASE_DIR, "public", "logo.svg")
ICON_PATH = os.path.join(BASE_DIR, "public", "icon.svg")
ICONS_DIR = os.path.join(BASE_DIR, "src-tauri", "icons")
MASTER_PATH = os.path.join(BASE_DIR, "master_icon.png")
TRAY_PATH = os.path.join(ICONS_DIR, "tray_icon.png")

def render_svg_with_swift(svg_path, out_path, width, height):
    swift_code = f"""
import Cocoa

func renderSvg(svgPath: String, outPath: String, width: Int, height: Int) {{
    let url = URL(fileURLWithPath: svgPath)
    guard let svgImage = NSImage(contentsOf: url) else {{
        fputs("Failed to load \\(svgPath)\\n", stderr)
        exit(1)
    }}
    let size = NSSize(width: width, height: height)
    guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil,
                               pixelsWide: width,
                               pixelsHigh: height,
                               bitsPerSample: 8,
                               samplesPerPixel: 4,
                               hasAlpha: true,
                               isPlanar: false,
                               colorSpaceName: .deviceRGB,
                               bytesPerRow: 0,
                               bitsPerPixel: 0) else {{
        fputs("Failed to create rep\\n", stderr)
        exit(1)
    }}
    NSGraphicsContext.saveGraphicsState()
    let context = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current = context
    let rect = NSRect(origin: .zero, size: size)
    svgImage.draw(in: rect, from: .zero, operation: .copy, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
    guard let pngData = rep.representation(using: .png, properties: [:]) else {{
        fputs("Failed to create PNG\\n", stderr)
        exit(1)
    }}
    try? pngData.write(to: URL(fileURLWithPath: outPath))
}}

renderSvg(svgPath: "{svg_path}", outPath: "{out_path}", width: {width}, height: {height})
"""
    subprocess.run(["swift", "-e", swift_code], check=True)

def generate_tray_icon():
    temp_tray = os.path.join(ICONS_DIR, "_temp_tray.png")
    # Render at high resolution 88x88 then resize with high quality
    render_svg_with_swift(ICON_PATH, temp_tray, 88, 88)
    
    img = Image.open(temp_tray)
    arr = np.array(img)
    alpha = arr[:, :, 3]
    
    # Create black template with preserved alpha
    template_arr = np.zeros_like(arr)
    template_arr[:, :, 3] = alpha
    template_img = Image.fromarray(template_arr)
    
    # Scale to 38x38 centered in 44x44 canvas for ideal macOS menu bar spacing
    target_canvas = Image.new('RGBA', (44, 44), (0, 0, 0, 0))
    resized_glyph = template_img.resize((38, 38), Image.Resampling.LANCZOS)
    target_canvas.paste(resized_glyph, (3, 3))
    target_canvas.save(TRAY_PATH, 'PNG')
    
    if os.path.exists(temp_tray):
        os.remove(temp_tray)
    print(f"macOS menu bar template icon generated at {TRAY_PATH}")

def generate_all():
    os.makedirs(ICONS_DIR, exist_ok=True)

    if not os.path.exists(LOGO_PATH):
        raise FileNotFoundError(f"Logo SVG not found at {LOGO_PATH}")
    if not os.path.exists(ICON_PATH):
        raise FileNotFoundError(f"Icon SVG not found at {ICON_PATH}")

    # 1. Render master app icon (1024x1024) from public/logo.svg
    print("Rendering 1024x1024 master app icon from public/logo.svg...")
    render_svg_with_swift(LOGO_PATH, MASTER_PATH, 1024, 1024)
    shutil.copyfile(MASTER_PATH, os.path.join(ICONS_DIR, "icon.png"))
    print("Master app icon generated at master_icon.png and src-tauri/icons/icon.png")

    # 2. Render macOS menu bar template icon (44x44) from public/icon.svg
    print("Rendering macOS menu bar icon from public/icon.svg...")
    generate_tray_icon()

    # 3. Generate all platform icon assets (icon.icns, icon.ico, Tauri PNGs)
    from export_all_icons import export_icons
    export_icons()
    print("All Spark icons generated successfully from public/logo.svg and public/icon.svg!")

if __name__ == "__main__":
    generate_all()
