"""生成 Relaywork 落地页的中英文 OG 分享图（1200x630 PNG）。

微信 / X / Facebook 等平台大多不抓取 SVG 作为 og:image，因此提供 PNG 版本。
依赖：Pillow（pip install Pillow）；字体从 Windows 系统目录读取，缺失时自动回退。
用法：python cortex/scripts/generate-og.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630
OUT = Path(__file__).resolve().parents[1] / "public"
FONT_DIR = Path("C:/Windows/Fonts")


def font(names, size):
    for name in names:
        path = FONT_DIR / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def background():
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    c0, c1 = (7, 11, 24), (30, 27, 75)
    for y in range(H):
        t = y / (H - 1)
        draw.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(c0, c1)))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((140, -540, 1060, 380), fill=(99, 102, 241, 120))
    return Image.alpha_composite(img.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(150)))


CONTENT = {
    "en": {
        "file": "relaywork-og.png",
        "lines": ("Stop doing the work", "a machine should do."),
        "sub": "AI automations built and run for small teams.",
        "cta": "Join the waitlist",
        "title_size": 68,
        "btn_w": 300,
        "zh": False,
    },
    "zh": {
        "file": "relaywork-og-zh.png",
        "lines": ("别再做机器", "本来该做的事。"),
        "sub": "为 5–50 人团队交付并运营 AI 自动化",
        "cta": "加入候补名单",
        "title_size": 64,
        "btn_w": 240,
        "zh": True,
    },
}


def render(spec):
    zh = spec["zh"]
    img = background().convert("RGB")
    draw = ImageDraw.Draw(img)

    bold = font(["msyhbd.ttc", "msyh.ttc"] if zh else ["seguisb.ttf", "segoeui.ttf"], 34)
    draw.rounded_rectangle((90, 90, 154, 154), radius=16, fill=(99, 102, 241))
    draw.text((122, 134), "R", font=bold, fill="white", anchor="mm")
    draw.text((178, 135), "Relaywork", font=bold, fill="white", anchor="lm")

    title = font(["msyhbd.ttc", "msyh.ttc"] if zh else ["seguisb.ttf", "segoeui.ttf"], spec["title_size"])
    sub = font(["msyh.ttc"] if zh else ["segoeui.ttf"], 28)
    draw.text((90, 290), spec["lines"][0], font=title, fill="white", anchor="ls")
    draw.text((90, 374), spec["lines"][1], font=title, fill=(165, 180, 252), anchor="ls")
    draw.text((90, 450), spec["sub"], font=sub, fill=(203, 213, 225), anchor="ls")

    draw.rounded_rectangle((90, 540, 90 + spec["btn_w"], 596), radius=12, fill=(52, 211, 153))
    cta_font = font(["msyhbd.ttc", "msyh.ttc"] if zh else ["seguisb.ttf", "segoeui.ttf"], 22)
    draw.text((90 + spec["btn_w"] / 2, 568), spec["cta"], font=cta_font, fill=(7, 11, 24), anchor="mm")

    target = OUT / spec["file"]
    img.save(target, "PNG", optimize=True)
    print(f"{target.name}: {target.stat().st_size} bytes")


if __name__ == "__main__":
    for item in CONTENT.values():
        render(item)
