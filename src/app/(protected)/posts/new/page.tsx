'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ImagePlus,
  LoaderCircle,
  UploadCloud,
  X,
} from 'lucide-react';

import SocialityLogo from '@/components/branding/sociality-logo';
import { Button } from '@/components/ui/button';
import { createPost } from '@/lib/api/posts';
import { getApiErrorMessage } from '@/lib/api/client';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 2000;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type SelectedImage = {
  file: File;
  previewUrl: string;
};

export default function CreatePostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null
  );
  const [caption, setCaption] = useState('');
  const [imageError, setImageError] = useState('');
  const [captionError, setCaptionError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const mutation = useMutation({
    mutationFn: createPost,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['feed'],
      });

      router.replace('/feed');
    },

    onError: (error: unknown) => {
      setServerError(getApiErrorMessage(error));
    },
  });

  function validateImage(file: File): string {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Please select a JPG, PNG, or WebP image.';
    }

    if (file.size === 0) {
      return 'The selected image is empty.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be smaller than 5 MB.';
    }

    return '';
  }

  function clearPreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function selectImage(file: File | null) {
    if (!file || mutation.isPending) {
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {
      setImageError(validationError);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    const previousPreviewUrl = previewUrlRef.current;

    previewUrlRef.current = nextPreviewUrl;

    setSelectedImage({
      file,
      previewUrl: nextPreviewUrl,
    });

    setImageError('');
    setServerError('');

    if (previousPreviewUrl) {
      URL.revokeObjectURL(previousPreviewUrl);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectImage(event.target.files?.[0] ?? null);

    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (mutation.isPending) {
      return;
    }

    selectImage(event.dataTransfer.files?.[0] ?? null);
  }

  function removeImage() {
    if (mutation.isPending) {
      return;
    }

    clearPreviewUrl();
    setSelectedImage(null);
    setImageError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mutation.isPending) {
      return;
    }

    setImageError('');
    setCaptionError('');
    setServerError('');

    if (!selectedImage) {
      setImageError('Please upload an image.');
      return;
    }

    const validationError = validateImage(selectedImage.file);

    if (validationError) {
      setImageError(validationError);
      return;
    }

    const trimmedCaption = caption.trim();

    if (!trimmedCaption) {
      setCaptionError('Please write a caption.');
      return;
    }

    if (trimmedCaption.length > MAX_CAPTION_LENGTH) {
      setCaptionError('Caption is too long.');
      return;
    }

    mutation.mutate({
      image: selectedImage.file,
      caption: trimmedCaption,
    });
  }

  const canSubmit =
    selectedImage !== null &&
    caption.trim().length > 0 &&
    caption.trim().length <= MAX_CAPTION_LENGTH &&
    !mutation.isPending;

  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10'>
        <div className='mx-auto flex h-[68px] max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6'>
          <SocialityLogo href='/feed' width={120} height={25} />

          <Link
            href='/feed'
            className='inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-[#D5D7DA] transition-colors hover:bg-white/10'
          >
            <ArrowLeft className='size-4' />
            Back to Timeline
          </Link>
        </div>
      </header>

      <main className='mx-auto w-full max-w-[640px] px-4 py-10 sm:px-5'>
        <div className='mb-7'>
          <h1 className='text-2xl font-semibold tracking-tight'>Create Post</h1>

          <p className='mt-2 text-sm text-[#A4A7AE]'>
            Share a moment with your community.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className='rounded-2xl border border-white/10 bg-[#0A0D12] p-4 sm:p-6'
        >
          {serverError && (
            <div
              role='alert'
              className='mb-5 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-300'
            >
              <AlertCircle className='size-4 shrink-0' />
              <span>{serverError}</span>
            </div>
          )}

          <label
            htmlFor='post-image'
            className='mb-2 block text-sm font-medium'
          >
            Photo
          </label>

          <input
            id='post-image'
            ref={fileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            onChange={handleFileChange}
            disabled={mutation.isPending}
            className='sr-only'
          />

          {selectedImage ? (
            <div className='relative overflow-hidden rounded-xl border border-white/10 bg-[#181D27]'>
              <div className='relative aspect-[4/3]'>
                <Image
                  src={selectedImage.previewUrl}
                  alt='Selected post preview'
                  fill
                  unoptimized
                  sizes='(max-width: 640px) 100vw, 600px'
                  className='object-contain'
                />
              </div>

              <button
                type='button'
                onClick={removeImage}
                disabled={mutation.isPending}
                aria-label='Remove selected image'
                className='absolute top-3 right-3 rounded-full bg-black/75 p-2 text-white transition-colors hover:bg-black disabled:opacity-50'
              >
                <X className='size-4' />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(event) => {
                event.preventDefault();

                if (!mutation.isPending) {
                  setIsDragging(true);
                }
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? 'border-[#7F51F9] bg-[#6936F2]/10'
                  : 'border-white/20 bg-[#181D27]/40'
              }`}
            >
              <div className='mb-4 rounded-full bg-[#6936F2]/15 p-4 text-[#A989FF]'>
                <ImagePlus className='size-7' />
              </div>

              <p className='text-sm font-semibold'>Upload your photo</p>

              <p className='mt-2 max-w-[280px] text-xs leading-5 text-[#A4A7AE]'>
                Choose an image or drag and drop it here. JPG, PNG, or WebP up
                to 5 MB.
              </p>

              <Button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                disabled={mutation.isPending}
                className='mt-5 rounded-full bg-[#6936F2] px-5 text-white hover:bg-[#7F51F9]'
              >
                <UploadCloud className='size-4' />
                Select Image
              </Button>
            </div>
          )}

          {imageError && (
            <p role='alert' className='mt-2 text-xs text-rose-400'>
              {imageError}
            </p>
          )}

          {selectedImage && (
            <div className='mt-3 flex items-center justify-between gap-3'>
              <p className='truncate text-xs text-[#A4A7AE]'>
                {selectedImage.file.name}
              </p>

              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                disabled={mutation.isPending}
                className='shrink-0 text-xs font-semibold text-[#A989FF] hover:text-white disabled:opacity-50'
              >
                Change photo
              </button>
            </div>
          )}

          <div className='mt-6'>
            <label
              htmlFor='post-caption'
              className='mb-2 block text-sm font-medium'
            >
              Caption
            </label>

            <textarea
              id='post-caption'
              value={caption}
              onChange={(event) => {
                setCaption(event.target.value);
                setCaptionError('');
              }}
              maxLength={MAX_CAPTION_LENGTH}
              rows={5}
              disabled={mutation.isPending}
              placeholder="What's on your mind?"
              aria-invalid={Boolean(captionError)}
              className='w-full resize-y rounded-xl border border-white/10 bg-[#181D27]/40 px-4 py-3 text-sm text-white outline-none placeholder:text-[#717680] focus:border-[#7F51F9] disabled:opacity-60'
            />

            <div className='mt-2 flex items-center justify-between gap-3'>
              <p
                role={captionError ? 'alert' : undefined}
                className={`text-xs ${
                  captionError ? 'text-rose-400' : 'text-[#717680]'
                }`}
              >
                {captionError || 'Write something meaningful.'}
              </p>

              <p className='text-xs text-[#717680]'>
                {caption.length}/{MAX_CAPTION_LENGTH}
              </p>
            </div>
          </div>

          <div className='mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
            <Link
              href='/feed'
              onClick={(event) => {
                if (mutation.isPending) {
                  event.preventDefault();
                }
              }}
              aria-disabled={mutation.isPending}
              className='inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-6 text-xs font-semibold hover:bg-white/10'
            >
              Cancel
            </Link>

            <Button
              type='submit'
              disabled={!canSubmit}
              className='h-11 rounded-full bg-[#6936F2] px-7 text-xs font-semibold text-white hover:bg-[#7F51F9] disabled:opacity-50'
            >
              {mutation.isPending ? (
                <>
                  <LoaderCircle className='size-4 animate-spin' />
                  Publishing...
                </>
              ) : (
                'Share Post'
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
