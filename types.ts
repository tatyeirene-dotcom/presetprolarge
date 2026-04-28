export interface XMPPreset {
  exposure: number;
  contrast: number;
  saturation: number;
  highlights: number;
  shadows: number;
  temperature: number;
  tint: number;
  brightness?: number;
  clarity?: number;
}

export interface PhotoState {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  processedUrl?: string;
}
