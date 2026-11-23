import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_spark_icon():
    size = 1024
    scale = 2
    canvas_size = size * scale # 2048x2048
    
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = int(100 * scale)
    box = [margin, margin, canvas_size - margin, canvas_size - margin]
    radius = int(185 * scale)

    # 1. Drop shadow behind the squircle
    shadow_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_img)
    s_offset = int(26 * scale)
    s_box = [margin, margin + s_offset, canvas_size - margin, canvas_size - margin + s_offset]
    s_draw.rounded_rectangle(s_box, radius=radius, fill=(0, 0, 0, 160))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius=int(30 * scale)))
    img.paste(shadow_img, (0, 0), shadow_img)

    # 2. Base squircle with rich dark obsidian-crimson gradient
    base_card = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(base_card)
    c_draw.rounded_rectangle(box, radius=radius, fill=(18, 14, 18, 255))

    # Vertical gradient for squircle: Obsidian Black -> Deep Charcoal/Wine
    grad_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(grad_img)
    for y in range(box[1], box[3]):
        ratio = (y - box[1]) / (box[3] - box[1])
        # Dark obsidian (#111116) to subtle dark ruby obsidian (#201014)
        r = int(17 + (32 - 17) * ratio)
        g = int(17 + (16 - 17) * ratio)
        b = int(22 + (20 - 22) * ratio)
        g_draw.line([(box[0], y), (box[2], y)], fill=(r, g, b, 255))

    mask = Image.new("L", (canvas_size, canvas_size), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle(box, radius=radius, fill=255)
    img.paste(grad_img, (0, 0), mask)

    # 3. Inner subtle glowing rim highlight
    rim_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    rim_draw = ImageDraw.Draw(rim_img)
    rim_draw.rounded_rectangle(box, radius=radius, outline=(255, 255, 255, 45), width=int(2.5 * scale))
    rim_draw.rounded_rectangle(box, radius=radius, outline=(239, 68, 68, 60), width=int(1.5 * scale))
    img.paste(rim_img, (0, 0), rim_img)

    # 4. Ambient warm red glow behind the center emblem
    glow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    gl_draw = ImageDraw.Draw(glow)
    gl_center = (canvas_size // 2, canvas_size // 2 - int(40 * scale))
    gl_radius = int(360 * scale)
    gl_draw.ellipse(
        [gl_center[0] - gl_radius, gl_center[1] - gl_radius, gl_center[0] + gl_radius, gl_center[1] + gl_radius],
        fill=(239, 68, 68, 48) # Warm fiery red/coral glow
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(75 * scale)))
    img.paste(glow, (0, 0), mask)

    # 5. Inner dark glass card
    cx, cy = canvas_size // 2, canvas_size // 2
    plate_box = [cx - int(280 * scale), cy - int(250 * scale), cx + int(280 * scale), cy + int(250 * scale)]
    plate_radius = int(45 * scale)
    plate_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(plate_img)
    p_draw.rounded_rectangle(plate_box, radius=plate_radius, fill=(12, 10, 14, 210), outline=(255, 255, 255, 25), width=int(2 * scale))
    
    # Top highlight on inner glass plate
    p_draw.line([(plate_box[0] + plate_radius, plate_box[1]), (plate_box[2] - plate_radius, plate_box[1])], fill=(255, 100, 100, 80), width=int(2 * scale))
    img.paste(plate_img, (0, 0), plate_img)

    # 6. Load bold font for the "S" emblem
    font_paths = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    font = None
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, size=int(260 * scale))
                break
            except Exception:
                continue

    if not font:
        font = ImageFont.load_default()

    # Calculate text bounds for "S"
    emblem_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    e_draw = ImageDraw.Draw(emblem_layer)
    text = "S"
    t_bbox = e_draw.textbbox((0, 0), text, font=font)
    tw = t_bbox[2] - t_bbox[0]
    th = t_bbox[3] - t_bbox[1]
    tx = cx - tw // 2
    ty = cy - th // 2 - int(35 * scale)

    # Drop shadow for "S"
    s_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    sl_draw = ImageDraw.Draw(s_layer)
    sl_draw.text((tx, ty + int(12 * scale)), text, font=font, fill=(0, 0, 0, 220))
    s_layer = s_layer.filter(ImageFilter.GaussianBlur(radius=int(10 * scale)))
    img.paste(s_layer, (0, 0), s_layer)

    # Gradient mask for "S"
    text_mask = Image.new("L", (canvas_size, canvas_size), 0)
    tm_draw = ImageDraw.Draw(text_mask)
    tm_draw.text((tx, ty), text, font=font, fill=255)

    # Vivid Red Gradient for "S":
    # Top: Bright Coral-Red (#FF5757) -> Vivid Crimson (#EF4444) -> Deep Fiery Ruby (#B91C1C)
    text_grad = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    tg_draw = ImageDraw.Draw(text_grad)
    for y in range(ty - 10, ty + th + 20):
        ratio = max(0.0, min(1.0, (y - ty) / max(1, th)))
        if ratio < 0.5:
            r_ratio = ratio / 0.5
            cr = int(255 + (239 - 255) * r_ratio)
            cg = int(95 + (40 - 95) * r_ratio)
            cb = int(95 + (50 - 95) * r_ratio)
        else:
            r_ratio = (ratio - 0.5) / 0.5
            cr = int(239 + (185 - 239) * r_ratio)
            cg = int(40 + (15 - 40) * r_ratio)
            cb = int(50 + (30 - 50) * r_ratio)
        tg_draw.line([(tx - 150, y), (tx + tw + 150, y)], fill=(cr, cg, cb, 255), width=2)

    img.paste(text_grad, (0, 0), text_mask)

    # Add a glowing top edge / bevel highlight to the S
    top_bevel = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    tb_draw = ImageDraw.Draw(top_bevel)
    tb_draw.text((tx, ty - int(2 * scale)), text, font=font, fill=(255, 190, 190, 140))
    img.paste(top_bevel, (0, 0), text_mask)

    # 7. Subtitle badge: "SPARK"
    sub_font = None
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                sub_font = ImageFont.truetype(fp, size=int(40 * scale))
                break
            except Exception:
                continue

    if sub_font:
        sub_text = "SPARK"
        st_bbox = e_draw.textbbox((0, 0), sub_text, font=sub_font)
        stw = st_bbox[2] - st_bbox[0]
        sth = st_bbox[3] - st_bbox[1]
        stx = cx - stw // 2
        sty = cy + int(115 * scale)

        # Background pill for SPARK
        pill_pad_x = int(28 * scale)
        pill_pad_y = int(9 * scale)
        pill_box = [stx - pill_pad_x, sty - pill_pad_y, stx + stw + pill_pad_x, sty + sth + pill_pad_y]
        p_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_img)
        p_draw.rounded_rectangle(pill_box, radius=int(14 * scale), fill=(30, 20, 24, 230), outline=(239, 68, 68, 140), width=int(2 * scale))
        img.paste(p_img, (0, 0), p_img)

        # SPARK text in clean off-white / light peach
        st_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        st_draw = ImageDraw.Draw(st_layer)
        st_draw.text((stx, sty), sub_text, font=sub_font, fill=(254, 242, 242, 255))
        img.paste(st_layer, (0, 0), st_layer)

    # 8. Top-right active spark / status dot
    dot_cx = plate_box[2] - int(32 * scale)
    dot_cy = plate_box[1] + int(32 * scale)
    dot_r = int(12 * scale)

    # Glow around dot
    dot_glow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    dg_draw = ImageDraw.Draw(dot_glow)
    dg_draw.ellipse(
        [dot_cx - dot_r*3, dot_cy - dot_r*3, dot_cx + dot_r*3, dot_cy + dot_r*3],
        fill=(239, 68, 68, 100)
    )
    dot_glow = dot_glow.filter(ImageFilter.GaussianBlur(radius=int(12 * scale)))
    img.paste(dot_glow, (0, 0), dot_glow)

    # Solid bright ruby/amber spark dot
    dot_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    dl_draw = ImageDraw.Draw(dot_layer)
    dl_draw.ellipse([dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r], fill=(248, 113, 113, 255), outline=(255, 255, 255, 190), width=int(2 * scale))
    img.paste(dot_layer, (0, 0), dot_layer)

    # Top-left window decorative indicator dots
    tl_x = plate_box[0] + int(32 * scale)
    tl_y = plate_box[1] + int(32 * scale)
    tl_r = int(6 * scale)
    dots_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    dt_draw = ImageDraw.Draw(dots_layer)
    colors = [(239, 68, 68, 220), (245, 158, 11, 220), (52, 211, 153, 220)]
    for i, col in enumerate(colors):
        x = tl_x + i * int(18 * scale)
        dt_draw.ellipse([x - tl_r, tl_y - tl_r, x + tl_r, tl_y + tl_r], fill=col)
    img.paste(dots_layer, (0, 0), dots_layer)

    # Downscale from 2048 to 1024 with Lanczos
    final_1024 = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_1024

def create_tray_icon():
    # 44x44 (macOS menu bar @2x)
    size = 44
    scale = 4
    canvas_size = size * scale # 176x176
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded squircle base for the tray icon
    margin = 8 * scale
    box = [margin, margin, canvas_size - margin, canvas_size - margin]
    draw.rounded_rectangle(box, radius=12 * scale, fill=(28, 25, 23, 255), outline=(239, 68, 68, 120), width=2 * scale)

    # Load bold font
    font = None
    for fp in ["/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"]:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, size=24 * scale)
                break
            except Exception:
                continue
    if not font:
        font = ImageFont.load_default()

    text = "S"
    t_bbox = draw.textbbox((0, 0), text, font=font)
    tw = t_bbox[2] - t_bbox[0]
    th = t_bbox[3] - t_bbox[1]
    tx = (canvas_size - tw) // 2
    ty = (canvas_size - th) // 2 - int(2 * scale)

    # Gradient mask for S
    text_mask = Image.new("L", (canvas_size, canvas_size), 0)
    tm_draw = ImageDraw.Draw(text_mask)
    tm_draw.text((tx, ty), text, font=font, fill=255)

    text_grad = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    tg_draw = ImageDraw.Draw(text_grad)
    for y in range(ty - 5, ty + th + 10):
        ratio = max(0.0, min(1.0, (y - ty) / max(1, th)))
        cr = int(255 + (220 - 255) * ratio)
        cg = int(90 + (38 - 90) * ratio)
        cb = int(90 + (38 - 90) * ratio)
        tg_draw.line([(0, y), (canvas_size, y)], fill=(cr, cg, cb, 255), width=2)

    img.paste(text_grad, (0, 0), text_mask)
    final_44 = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_44

if __name__ == "__main__":
    icon = create_spark_icon()
    icon.save("./master_icon.png")
    print("Master 1024x1024 Spark icon generated successfully at master_icon.png")

    tray = create_tray_icon()
    tray.save("./src-tauri/icons/tray_icon.png")
    print("Tray icon 44x44 generated successfully at src-tauri/icons/tray_icon.png")
