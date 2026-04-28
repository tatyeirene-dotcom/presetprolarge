/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  FileCode, 
  Download, 
  CheckCircle2, 
  X, 
  Loader2, 
  Settings2,
  Trash2,
  Info
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PhotoState, XMPPreset } from './types';
import { parseXMP } from './lib/xmpParser';
import { processImage } from './lib/imageProcessor';

const MAX_PHOTOS = 400;

export default function App() {
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const [preset, setPreset] = useState<XMPPreset | null>(null);
  const [presetName, setPresetName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zipStatus, setZipStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xmpInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length + photos.length > MAX_PHOTOS) {
      alert(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    const newPhotos: PhotoState[] = files.map((file: File) => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'idle'
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleXMPUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseXMP(text);
      setPreset(parsed);
      setPresetName(file.name);
    } catch (err) {
      alert('Failed to parse XMP file.');
      console.error(err);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const filtered = prev.filter(p => p.id !== id);
      const removed = prev.find(p => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return filtered;
    });
  };

  const clearAll = () => {
    photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setPreset(null);
    setPresetName('');
    setProgress(0);
  };

  const startBatchProcess = async () => {
    if (!preset || photos.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    const zip = new JSZip();

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'processing' } : p));

      try {
        const processedBlob = await processImage(photo.file, preset);
        const fileName = `${photo.file.name.split('.')[0]}_presetpro.jpg`;
        zip.file(fileName, processedBlob);
        
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'completed' } : p));
      } catch (err) {
        console.error(err);
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'error' } : p));
      }

      setProgress(Math.round(((i + 1) / photos.length) * 100));
    }

    setZipStatus('Generating ZIP...');
    const content = await zip.generateAsync({ type: 'blob' });
    setZipStatus('Downloading...');
    saveAs(content, `processed_photos_${new Date().getTime()}.zip`);
    setIsProcessing(false);
    setZipStatus('');
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-300 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-violet-600/20">
            X
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            XMP <span className="text-violet-500">Batch</span> Pro
          </h1>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full text-zinc-400 border border-zinc-800">
            <div className={`w-2 h-2 rounded-full ${photos.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`}></div>
            <span>{photos.length > 0 ? 'System Active' : 'System Idle'}</span>
          </div>
          
          <button 
            disabled={!preset || photos.length === 0 || isProcessing}
            onClick={startBatchProcess}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:grayscale flex items-center gap-2 shadow-lg shadow-violet-600/20"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isProcessing ? (zipStatus || `${progress}%`) : 'Export All'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-zinc-950 p-6 border-r border-zinc-800 flex flex-col gap-8 overflow-y-auto">
          {/* Source Content */}
          <section className="space-y-4">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">Source Content</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-violet-500/50 hover:bg-violet-600/5 transition-all cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
              <Upload className="w-8 h-8 mx-auto mb-3 text-zinc-600 group-hover:text-violet-500 transition-colors" />
              <p className="text-xs font-semibold text-zinc-400">Add Photos</p>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-tight">Up to 400 total</p>
            </div>
            
            {photos.length > 0 && (
              <button 
                onClick={clearAll}
                className="w-full py-2 px-4 border border-zinc-800 hover:bg-zinc-900 rounded-lg text-[10px] font-bold text-zinc-400 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={12} /> Clear Cache
              </button>
            )}
          </section>

          {/* Preset Selection */}
          <section className="space-y-4">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">XMP Preset</label>
            <div 
              onClick={() => xmpInputRef.current?.click()}
              className={`bg-violet-600/5 border rounded-xl p-4 transition-all cursor-pointer group ${preset ? 'border-violet-500/50 hover:bg-violet-600/10' : 'border-zinc-800 border-dashed hover:border-zinc-700'}`}
            >
              <input 
                type="file" 
                ref={xmpInputRef} 
                accept=".xmp" 
                onChange={handleXMPUpload} 
                className="hidden" 
              />
              
              {preset ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center shrink-0">
                      <FileCode className="text-white w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{presetName}</p>
                      <p className="text-[10px] text-violet-400">Ready to apply</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-y-2">
                    <div className="text-[9px] text-zinc-500 uppercase">Exp: <span className="text-zinc-300">{preset.exposure.toFixed(1)}</span></div>
                    <div className="text-[9px] text-zinc-500 uppercase">Sat: <span className="text-zinc-300">{preset.saturation}</span></div>
                    <div className="text-[9px] text-zinc-500 uppercase">Con: <span className="text-zinc-300">{preset.contrast}</span></div>
                    <div className="text-[9px] text-zinc-500 uppercase">Sha: <span className="text-zinc-300">{preset.shadows}</span></div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Settings2 className="w-6 h-6 mx-auto mb-2 text-zinc-600 group-hover:text-violet-500 transition-colors" />
                  <p className="text-xs font-semibold text-zinc-400">Select .xmp file</p>
                </div>
              )}
            </div>
          </section>

          <footer className="mt-auto space-y-4 pt-6 border-t border-zinc-800">
            <div className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <Info size={14} className="text-zinc-500 shrink-0" />
              <p className="text-[9px] text-zinc-500 leading-relaxed uppercase tracking-wider">
                All processing is local. Data does not leave your device.
              </p>
            </div>
          </footer>
        </aside>

        {/* Content Area */}
        <section className="flex-1 bg-[#121214] p-8 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold flex items-center gap-2 tracking-tight">
              <div className="w-1.5 h-4 bg-violet-600 rounded-full"></div>
              Units in Queue ({photos.length})
            </h2>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 uppercase font-bold tracking-widest leading-none flex items-center">
                JPG Output
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 -mr-4 scrollbar-hide">
            {photos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 select-none grayscale">
                <ImageIcon size={64} strokeWidth={1} />
                <p className="mt-4 font-bold uppercase tracking-[0.2em] text-sm">Waiting for content</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 xxl:grid-cols-10 gap-3">
                <AnimatePresence>
                  {photos.map((photo) => (
                    <motion.div 
                      key={photo.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative aspect-square group bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-violet-500/50 transition-all shadow-md shadow-black/20"
                    >
                      <img 
                        src={photo.previewUrl} 
                        className={`w-full h-full object-cover transition-all duration-500 ${photo.status === 'processing' ? 'brightness-50 scale-105' : 'group-hover:scale-105'} ${photo.status === 'completed' ? 'opacity-80' : ''}`} 
                        alt="preview"
                      />
                      
                      {/* Processing gradient overlay */}
                      {photo.status === 'processing' && (
                        <div className="absolute inset-0 bg-gradient-to-t from-violet-600/40 to-transparent">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="text-white animate-spin" size={24} />
                          </div>
                        </div>
                      )}

                      {/* Completed Overlay */}
                      {photo.status === 'completed' && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-0.5 shadow-lg">
                          <CheckCircle2 size={10} className="text-white" />
                        </div>
                      )}

                      {/* Delete Action */}
                      {!isProcessing && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                          className="absolute -top-10 group-hover:top-2 right-2 bg-black/60 backdrop-blur-md text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600/80"
                        >
                          <X size={12} />
                        </button>
                      )}
                      
                      {/* Name Label */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm p-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-[8px] text-zinc-300 truncate tracking-tight">{photo.file.name}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
