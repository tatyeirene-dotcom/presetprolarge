import { XMPPreset } from '../types';

export async function processImage(imageSource: string | File, preset: XMPPreset): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Apply Filter adjustments
      // Note: This is an approximation of Lightroom settings using Canvas filter strings
      // exposure: -5 to +5 -> 0% to 200% (approx)
      // contrast: -100 to +100 -> 0% to 200%
      // saturation: -100 to +100 -> 0% to 200%
      
      const exposureShift = preset.exposure * 0.2; // roughly 20% per stop
      const brightness = 1 + exposureShift;
      const contrast = 1 + (preset.contrast / 100);
      const saturation = 1 + (preset.saturation / 100);
      
      // We apply these via ctx.filter for simplicity and performance
      // Complex CSS filter string
      ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
      
      // Clear and redraw with filter
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Temperature/Tint is harder with CSS filters, we might skip for basic version
      // or use a color overlay
      if (preset.temperature !== 0) {
        // Simple warm/cool overlay
        const tempColor = preset.temperature > 0 ? `rgba(255, 100, 0, ${Math.abs(preset.temperature) / 4000})` : `rgba(0, 100, 255, ${Math.abs(preset.temperature) / 4000})`;
        ctx.fillStyle = tempColor;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', 0.9);
    };
    img.onerror = reject;

    if (imageSource instanceof File) {
      img.src = URL.createObjectURL(imageSource);
    } else {
      img.src = imageSource;
    }
  });
}
