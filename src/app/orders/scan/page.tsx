'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ScanReceiptPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewURL(URL.createObjectURL(selectedFile));
      setScanResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('image/')) {
      setFile(dropped);
      setPreviewURL(URL.createObjectURL(dropped));
      setScanResult(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;

    try {
      // 1. Upload to Cloudinary
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'scm_receipts');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      setIsUploading(false);

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload image');
      }

      // 2. Scan with Groq Vision
      setIsScanning(true);
      const visionRes = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url }),
      });

      const visionData = await visionRes.json();
      setIsScanning(false);

      if (visionData.success) {
        setScanResult(visionData.data);
      } else {
        throw new Error(visionData.error || 'Failed to scan image');
      }
    } catch (err: any) {
      setIsUploading(false);
      setIsScanning(false);
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div>
        <h1>Scan Resi Pengiriman</h1>
        <p className="text-muted">Upload gambar resi untuk otomatis mengekstrak data pesanan.</p>
      </div>

      <div className="glass-card flex flex-col items-center gap-6 p-8">
        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-[rgba(var(--primary),0.5)] rounded-2xl w-full h-64 flex flex-col items-center justify-center relative hover-bg cursor-pointer transition-all"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {previewURL ? (
            <img src={previewURL} alt="Preview" className="h-full object-contain rounded-xl p-2" />
          ) : (
            <div className="flex flex-col items-center text-muted">
              <span className="text-4xl mb-2">📸</span>
              <p>Klik atau drag & drop gambar resi ke sini</p>
              <span className="text-sm">Mendukung JPG, PNG, WEBP</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button 
          onClick={handleScan}
          disabled={!file || isUploading || isScanning}
          className="btn btn-primary w-full py-3 text-lg"
        >
          {isUploading ? '📤 Mengupload ke Cloud...' : 
           isScanning ? '🤖 AI Sedang Menganalisis...' : 
           'Mulai Analisis AI OCR'}
        </button>
      </div>

      {/* Results */}
      {scanResult && (
        <div className="glass-card" style={{ borderLeft: '4px solid rgb(var(--success))' }}>
          <h3>Hasil Pemindaian AI:</h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted">Nama Pembeli</span>
              <span className="font-semibold">{scanResult.customerName || 'Tidak terbaca'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted">No. Resi</span>
              <span className="font-semibold">{scanResult.trackingNumber || 'Tidak terbaca'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted">Platform</span>
              <span className="font-semibold">{scanResult.platform || 'Manual'}</span>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-2 text-right">
             <button className="btn btn-outline" onClick={() => setScanResult(null)}>Scan Ulang</button>
             {/* Note: This should ideally link to the new order page, pre-filled */}
             <a href={`/orders/new?name=${scanResult.customerName}&platform=${scanResult.platform}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
               Buat Pesanan dengan Data Ini
             </a>
          </div>
        </div>
      )}
    </div>
  );
}
