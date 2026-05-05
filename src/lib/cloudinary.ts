const DEFAULT_CLOUD_NAME = 'drcfeoi6p';
const DEFAULT_UPLOAD_PRESET = 'catelogstore';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? DEFAULT_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? DEFAULT_UPLOAD_PRESET;

const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

type UploadOptions = {
  folder?: string;
};

export const getCloudinaryConfig = () => ({
  cloudName,
  uploadPreset,
  uploadUrl,
});

export async function uploadImageToCloudinary(file: File, options?: UploadOptions): Promise<string> {
  if (!uploadPreset || !cloudName) {
    throw new Error('Cloudinary credentials are missing. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (options?.folder) {
    formData.append('folder', options.folder);
  }

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  console.log('Cloudinary full response:', data);
  console.log('Cloudinary URL:', data?.secure_url);
  console.log('Cloudinary error:', data?.error);

  if (!response.ok || data?.error) {
    const message = data?.error?.message ?? 'Cloudinary upload failed.';
    throw new Error(message);
  }

  if (!data?.secure_url) {
    throw new Error('Cloudinary did not return a secure URL.');
  }

  return data.secure_url as string;
}
