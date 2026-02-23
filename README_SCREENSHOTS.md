# Screenshots for Chrome Web Store

## How to Add Screenshots

1. **Save the uploaded image** as `tab-saver-screenshot.png` in this folder
2. **Run the conversion script** below to resize to 640x400

## Screenshot Requirements

- **Size**: 640x400 pixels (recommended) or 1280x800
- **Format**: JPEG or 24-bit PNG (no alpha)
- **Max**: 5 screenshots
- **Quality**: High resolution, clear text

## Recommended Screenshots

1. **Main View** - Show categorized tabs (current image)
2. **Save Action** - Show "Save All Tabs" functionality
3. **Search** - Show search working
4. **Forms** - Show application detection
5. **Empty State** - Show initial view

## Conversion Command

Once you have `tab-saver-screenshot.png`:

```bash
python3 -c "
from PIL import Image
img = Image.open('tab-saver-screenshot.png')
img_resized = img.resize((640, 400), Image.LANCZOS)
img_resized.save('screenshot_640x400.jpeg', 'JPEG', quality=95)
print('Screenshot ready for Chrome Web Store!')
"
```

## Current Status

⏳ Waiting for: `tab-saver-screenshot.png` file
✅ Ready: Processing script
🎯 Goal: Chrome Web Store screenshots
