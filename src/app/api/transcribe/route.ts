import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { audioUrl } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
    }

    // Fetch the audio file from the URL (Cloudinary)
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File-like object for Groq SDK
    // Whisper supports flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
    const file = new File([buffer], 'voice.webm', { type: 'audio/webm' });

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3-turbo',
      language: 'id',
      response_format: 'json',
    });

    return NextResponse.json({ 
      success: true, 
      text: transcription.text 
    });

  } catch (error: any) {
    console.error('Groq Transcription error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mentranskripsi suara' }, { status: 500 });
  }
}
