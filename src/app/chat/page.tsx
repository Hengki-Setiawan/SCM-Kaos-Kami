'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Mic, Image as ImageIcon, Square, X, Loader2 } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Halo Bos! Ada yang bisa saya bantu? Upload gambar resi atau kirim pesan suara juga bisa lho, persis seperti bot Telegram kita! 🤖' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Record error:', err);
      alert('Gagal mengakses mikrofon.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      // 1. Upload audio to Cloudinary
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('folder', 'voice_messages');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.url) throw new Error('Gagal upload audio');

      // 2. Transcribe using Groq Whisper
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: uploadData.url }),
      });
      const transcribeData = await transcribeRes.json();

      if (transcribeData.text) {
        setInput(transcribeData.text);
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      alert('Gagal memproses suara.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !imageFile) return;

    const userText = input.trim();
    const currentImage = imageFile;
    const currentPreview = imagePreview;

    setInput('');
    removeImage();
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: userText || (currentImage ? 'Kirim gambar' : ''),
      imageUrl: currentPreview || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let uploadedImageUrl = '';
      
      // Upload image if present
      if (currentImage) {
        const formData = new FormData();
        formData.append('file', currentImage);
        formData.append('folder', 'chat_vision');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        uploadedImageUrl = uploadData.url;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          imageUrl: uploadedImageUrl,
          context: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: data.response || 'Terjadi kesalahan pada AI.'
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: 'Koneksi ke AI gagal.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto" style={{ height: 'calc(100vh - 140px)', minHeight: '400px' }}>
      <div className="flex justify-between items-center mobile-hidden p-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Llama AI Assistant</h1>
            <p className="text-xs text-muted flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success"></span> Online & Multimodal
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card flex flex-col" style={{ flex: 1, overflow: 'hidden', padding: 0, border: '1px solid rgba(var(--border), 0.5)' }}>
        {/* Messages Wrapper */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="custom-scrollbar">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`p-2 rounded-lg ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-hover/80 text-muted'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div 
                className={`max-w-[85%] md:max-w-[70%] group`}
                style={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' : 'rgba(var(--surface-hover), 1)',
                  color: msg.role === 'user' ? 'white' : 'inherit',
                  padding: '0.85rem 1rem',
                  borderRadius: '16px',
                  borderTopRightRadius: msg.role === 'user' ? '2px' : '16px',
                  borderTopLeftRadius: msg.role === 'assistant' ? '2px' : '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                {msg.imageUrl && (
                  <div className="mb-3 overflow-hidden rounded-lg border border-white/20">
                    <img src={msg.imageUrl} alt="Chat attachment" className="max-h-60 w-full object-cover" />
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem' }}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted text-sm ml-10">
               <Loader2 size={16} className="animate-spin" />
               <span>AI sedang menganalisis...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Action Panel: Recording & Image Preview */}
        {(isRecording || imagePreview || isTranscribing) && (
          <div className="px-4 py-2 border-t border-border/50 bg-black/5 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
             {isRecording ? (
               <div className="flex items-center gap-3 text-danger font-medium">
                 <div className="w-2 h-2 rounded-full bg-danger animate-pulse"></div>
                 <span>Merekam... {formatTime(recordingSeconds)}</span>
               </div>
             ) : isTranscribing ? (
               <div className="flex items-center gap-2 text-primary">
                 <Loader2 size={16} className="animate-spin" />
                 <span>Menyalin suara...</span>
               </div>
             ) : imagePreview ? (
               <div className="relative group/preview">
                 <img src={imagePreview} className="w-12 h-12 rounded object-cover border border-primary/20" alt="Preview" />
                 <button 
                  onClick={removeImage}
                  className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-0.5 shadow-lg"
                 >
                   <X size={12} />
                 </button>
               </div>
             ) : null}
             
             {isRecording && (
               <button onClick={stopRecording} className="btn btn-danger btn-sm rounded-full px-4 flex items-center gap-2">
                 <Square size={14} fill="currentColor" /> Selesai
               </button>
             )}
           </div>
        )}

        {/* Redesigned Input Form — Integrated Pill View */}
        <div className="p-4 bg-surface" style={{ borderTop: '1px solid rgba(var(--border), 0.2)' }}>
          <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
            
            <div className={`flex items-center gap-1 p-1.5 rounded-2xl bg-surface-hover/40 border-2 transition-all duration-300 ${isLoading ? 'opacity-50 grayscale' : 'focus-within:border-primary/30 focus-within:bg-surface focus-within:shadow-lg focus-within:shadow-primary/5'} border-transparent`}>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl hover:bg-white text-muted-foreground hover:text-primary transition-all active:scale-95"
                title="Upload Gambar"
                disabled={isLoading}
              >
                <ImageIcon size={20} />
              </button>
              
              {!input && !isLoading && (
                <button 
                  type="button" 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-xl transition-all active:scale-95 ${isRecording ? 'bg-danger text-white shadow-lg animate-pulse' : 'hover:bg-white text-muted-foreground hover:text-primary'}`}
                  title={isRecording ? "Stop Recording" : "Pesan Suara"}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                </button>
              )}

              <input 
                type="text" 
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 px-3" 
                placeholder={isRecording ? "Mendengarkan..." : "Tulis pesan atau tanya stok..."} 
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading || isRecording}
              />

              <button 
                type="submit" 
                className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 disabled:opacity-0 disabled:scale-90 transition-all active:scale-95" 
                disabled={isLoading || (!input.trim() && !imageFile)}
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
