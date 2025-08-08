#!/usr/bin/env python3

import os
import pytesseract
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def test_improved_ocr():
    print("=== Improved OCR Test ===")
    
    # Test different OCR configurations
    configs = [
        ("Default", "--oem 3 --psm 6"),
        ("Single Line", "--oem 3 --psm 7"),
        ("Single Word", "--oem 3 --psm 8"),
        ("Single Character", "--oem 3 --psm 10"),
        ("Sparse Text", "--oem 3 --psm 11"),
        ("Legacy Engine", "--oem 0 --psm 6"),
        ("LSTM Engine", "--oem 1 --psm 6"),
    ]
    
    # Test languages
    languages = [
        ("English Only", "eng"),
        ("Hindi Only", "hin"),
        ("English + Hindi", "eng+hin"),
        ("Hindi + English", "hin+eng"),
    ]
    
    # Create a better test image
    img = Image.new('RGB', (600, 200), color='white')
    draw = ImageDraw.Draw(img)
    
    # Try to use a better font for Hindi
    try:
        # Try system fonts that support Hindi
        font_paths = [
            "/System/Library/Fonts/Supplemental/Arial Unicode MS.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Arial.ttf",
        ]
        
        font = None
        for font_path in font_paths:
            try:
                font = ImageFont.truetype(font_path, 24)
                print(f"Using font: {font_path}")
                break
            except:
                continue
        
        if font is None:
            font = ImageFont.load_default()
            print("Using default font")
            
    except Exception as e:
        font = ImageFont.load_default()
        print(f"Font error: {e}, using default")
    
    # Draw test text
    test_text_eng = "Hello World 123"
    test_text_hindi = "नमस्ते दुनिया"
    
    draw.text((10, 10), test_text_eng, fill='black', font=font)
    draw.text((10, 50), test_text_hindi, fill='black', font=font)
    
    # Save test image
    img.save("test_improved_ocr.png")
    print("Created improved test image: test_improved_ocr.png")
    
    # Test all combinations
    for lang_name, lang_code in languages:
        print(f"\n--- Testing {lang_name} ({lang_code}) ---")
        
        for config_name, config in configs:
            try:
                result = pytesseract.image_to_string(
                    img, 
                    lang=lang_code, 
                    config=config
                )
                
                print(f"{config_name}: '{result.strip()}'")
                
                # Check if we got any meaningful text
                if test_text_eng.lower() in result.lower():
                    print(f"  ✅ English text found with {config_name}")
                
                if test_text_hindi in result:
                    print(f"  ✅ Hindi text found with {config_name}")
                elif any(char in result for char in "नमस्ते"):
                    print(f"  ⚠️  Partial Hindi text found with {config_name}")
                else:
                    print(f"  ❌ No Hindi text found with {config_name}")
                    
            except Exception as e:
                print(f"{config_name}: Error - {e}")

def test_real_pdf_ocr():
    print("\n=== Testing PDF OCR Configuration ===")
    
    # Test the exact configuration used in the PDF processing
    ocr_language = os.getenv("OCR_LANGUAGE", "eng+hin")
    ocr_config = os.getenv("OCR_CONFIG", "--oem 3 --psm 6")
    
    print(f"Current PDF OCR config: lang={ocr_language}, config={ocr_config}")
    
    # Create a test image similar to what might come from a PDF
    img = Image.new('RGB', (800, 400), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    # Simulate PDF content
    content = [
        "Document Title",
        "This is a sample document with mixed content.",
        "नमस्ते, यह एक नमूना दस्तावेज़ है।",
        "It contains both English and Hindi text.",
        "इसमें अंग्रेजी और हिंदी दोनों भाषाएं हैं।"
    ]
    
    y_pos = 20
    for line in content:
        draw.text((20, y_pos), line, fill='black', font=font)
        y_pos += 30
    
    img.save("test_pdf_ocr.png")
    print("Created PDF-style test image: test_pdf_ocr.png")
    
    # Test with current configuration
    try:
        result = pytesseract.image_to_string(
            img, 
            lang=ocr_language, 
            config=ocr_config
        )
        
        print(f"PDF OCR Result:\n{result}")
        
        # Check for specific content
        if "Document Title" in result:
            print("✅ English title detected")
        if "नमस्ते" in result:
            print("✅ Hindi greeting detected")
        if "नमूना" in result:
            print("✅ Hindi word 'sample' detected")
        if "दस्तावेज़" in result:
            print("✅ Hindi word 'document' detected")
            
    except Exception as e:
        print(f"PDF OCR Error: {e}")

if __name__ == "__main__":
    test_improved_ocr()
    test_real_pdf_ocr()
