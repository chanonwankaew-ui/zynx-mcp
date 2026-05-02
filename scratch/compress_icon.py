from PIL import Image

# Open the original image
img = Image.open('docs/assets/zynx-icon.png')

# Resize to 128x128
img = img.resize((128, 128), Image.Resampling.LANCZOS)

# Convert to 8-bit palette (PNG8) to drastically reduce size
img_p = img.convert('P', palette=Image.Palette.ADAPTIVE, colors=128)

# Save as PNG
img_p.save('docs/assets/zynx-icon-128.png', optimize=True)

import os
size = os.path.getsize('docs/assets/zynx-icon-128.png')
print(f"Final size: {size / 1024:.2f} KB")
