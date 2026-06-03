import sys
try:
    from PIL import Image, ImageChops
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageChops

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

def make_transparent(im):
    im = im.convert("RGBA")
    datas = im.getdata()
    newData = []
    
    # We assume the top-left pixel is the background color
    bg_color = datas[0]
    # We want to make all pixels close to bg_color transparent
    threshold = 240
    
    for item in datas:
        # If it's a white-ish background, make it transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    im.putdata(newData)
    return im

def process_logo(input_path, output_path):
    print(f"Processing {input_path}...")
    im = Image.open(input_path)
    
    # First make background transparent
    print("Making background transparent...")
    im = make_transparent(im)
    
    # Then trim empty space
    print("Trimming whitespace...")
    trimmed_im = trim(im)
    
    print(f"Saving to {output_path}...")
    trimmed_im.save(output_path, "PNG")
    print("Done!")

if __name__ == "__main__":
    input_file = r"f:\MINI PROJECTS\ai based interview\public\logo.png"
    process_logo(input_file, input_file)
