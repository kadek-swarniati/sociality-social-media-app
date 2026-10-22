import { api } from '@/lib/api/client';

export type CreatePostPayload = {
  image: File;
  caption: string;
};

export async function createPost({
  image,
  caption,
}: CreatePostPayload): Promise<unknown> {
  const formData = new FormData();

  formData.append('image', image);
  formData.append('caption', caption.trim());

  const response = await api.post<unknown>('/posts', formData, {
    timeout: 60000,
  });

  return response.data;
}
