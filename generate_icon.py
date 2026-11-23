import os
import subprocess
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SVG_PATH = os.path.join(BASE_DIR, "public", "spark.svg")
MONO_SVG_PATH = os.path.join(BASE_DIR, "public", "spark-mono.svg")
ICONS_DIR = os.path.join(BASE_DIR, "src-tauri", "icons")
MASTER_PATH = os.path.join(BASE_DIR, "master_icon.png")
TRAY_PATH = os.path.join(ICONS_DIR, "tray_icon.png")

def render_svg_with_swift(svg_path, out_path, width, height):
    swift_code = f"""
import Cocoa

func renderSvg(svgPath: String, outPath: String, width: Int, height: Int) {{
    let url = URL(fileURLWithPath: svgPath)
    guard let svgImage = NSImage(contentsOf: url) else {{
        fputs("Failed to load \\(svgPath)\\\\n", stderr)
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

def generate_all():
    os.makedirs(ICONS_DIR, exist_ok=True)

    # 1. Ensure public/spark-mono.svg exists
    if not os.path.exists(MONO_SVG_PATH):
        mono_svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect x="5" y="5" width="90" height="90" rx="22" stroke="#000000" stroke-width="7"/>
  <text x="50" y="71" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="65" font-weight="900" text-anchor="middle" fill="#000000">S</text>
  <circle cx="77" cy="23" r="5.5" fill="#000000" />
</svg>
'''
        with open(MONO_SVG_PATH, "w", encoding="utf-8") as f:
            f.write(mono_svg_content)
        print("Created public/spark-mono.svg")

    # 2. Render master app icon (1024x1024) from public/spark.svg
    print("Rendering 1024x1024 master app icon from public/spark.svg...")
    render_svg_with_swift(SVG_PATH, MASTER_PATH, 1024, 1024)
    shutil.copyfile(MASTER_PATH, os.path.join(ICONS_DIR, "icon.png"))
    print("Master app icon generated at master_icon.png and src-tauri/icons/icon.png")

    # 3. Render black & white macOS menu bar template icon (44x44, 22pt @2x)
    print("Rendering black & white menu bar icon from public/spark-mono.svg...")
    render_svg_with_swift(MONO_SVG_PATH, TRAY_PATH, 44, 44)
    print("Menu bar template icon generated at src-tauri/icons/tray_icon.png")

    # 4. Generate all platform icon assets (icon.icns, icon.ico, Tauri PNGs)
    from export_all_icons import export_icons
    export_icons()
    print("All Spark icons generated successfully from public/spark.svg!")

if __name__ == "__main__":
    generate_all()
