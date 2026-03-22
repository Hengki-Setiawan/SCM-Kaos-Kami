import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'scm_kaos_kami';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // E6: Validate file type and size
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
      'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/x-m4a'
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipe file tidak didukung.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) { // Increased to 10MB for audio
      return NextResponse.json({ error: 'Ukuran file maksimal 10MB.' }, { status: 400 });
    }

    // Convert file to buffer, then to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileBase64, {
      folder: folder,
      resource_type: 'auto', // Support audio/video automaticaly
      transformation: file.type.startsWith('image/') ? [
        { width: 1000, crop: 'limit' }, 
        { quality: 'auto', fetch_format: 'auto' } 
      ] : undefined
    });

    return NextResponse.json({ 
      success: true, 
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengupload gambar' }, { status: 500 });
  }
}
