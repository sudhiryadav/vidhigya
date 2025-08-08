#!/usr/bin/env python3

import os
import pytesseract
from PIL import Image
import numpy as np

def test_ocr_configuration():
    print("=== OCR Configuration Test ===")
    
    # Check environment variables
    ocr_language = os.getenv("OCR_LANGUAGE", "eng+hin")
    ocr_config = os.getenv("OCR_CONFIG", "--oem 3 --psm 6")
    ocr_enabled = os.getenv("OCR_ENABLED", "True").lower() == "true"
    
    print(f"OCR_ENABLED: {ocr_enabled}")
    print(f"OCR_LANGUAGE: {ocr_language}")
    print(f"OCR_CONFIG: {ocr_config}")
    
    # Check available languages
    try:
        available_langs = pytesseract.get_languages()
        print(f"Available languages: {available_langs}")
        
        # Check if configured languages are available
        configured_langs = ocr_language.split('+')
        for lang in configured_langs:
            if lang in available_langs:
                print(f"✅ Language '{lang}' is available")
            else:
                print(f"❌ Language '{lang}' is NOT available")
                
    except Exception as e:
        print(f"Error getting languages: {e}")
    
    # Test OCR with a simple image
    print("\n=== Testing OCR with sample text ===")
    try:
        # Create a simple test image with text
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a white image
        img = Image.new('RGB', (400, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a font (fallback to default if not available)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        # Draw test text
        test_text = "Hello World 123"
        draw.text((10, 10), test_text, fill='black', font=font)
        
        # Save test image
        img.save("test_ocr_image.png")
        print("Created test image: test_ocr_image.png")
        
        # Run OCR
        ocr_result = pytesseract.image_to_string(
            img, 
            lang=ocr_language, 
            config=ocr_config
        )
        
        print(f"OCR Result: '{ocr_result.strip()}'")
        print(f"Expected: '{test_text}'")
        
        if test_text.lower() in ocr_result.lower():
            print("✅ OCR test PASSED")
        else:
            print("❌ OCR test FAILED")
            
    except Exception as e:
        print(f"Error testing OCR: {e}")
    
    # Test Hindi text if Hindi is configured
    if 'hin' in ocr_language:
        print("\n=== Testing Hindi OCR ===")
        try:
            # Create a simple test image with Hindi text
            img_hindi = Image.new('RGB', (400, 100), color='white')
            draw_hindi = ImageDraw.Draw(img_hindi)
            
            # Hindi test text
            hindi_text = "नमस्ते दुनिया"
            draw_hindi.text((10, 10), hindi_text, fill='black', font=font)
            
            # Save test image
            img_hindi.save("test_hindi_ocr.png")
            print("Created Hindi test image: test_hindi_ocr.png")
            
            # Run OCR
            ocr_result_hindi = pytesseract.image_to_string(
                img_hindi, 
                lang=ocr_language, 
                config=ocr_config
            )
            
            print(f"Hindi OCR Result: '{ocr_result_hindi.strip()}'")
            print(f"Expected: '{hindi_text}'")
            
            if hindi_text in ocr_result_hindi:
                print("✅ Hindi OCR test PASSED")
            else:
                print("❌ Hindi OCR test FAILED")
                
        except Exception as e:
            print(f"Error testing Hindi OCR: {e}")

if __name__ == "__main__":
    test_ocr_configuration()
