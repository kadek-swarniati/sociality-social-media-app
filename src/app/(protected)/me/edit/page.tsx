'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';

import { getMyProfile, updateMyProfile } from '@/lib/api/account';
import { getApiErrorMessage } from '@/lib/api/client';

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, or underscores.'),
  phone: z.string().trim().max(30),
  bio: z.string().trim().max(500),
});

type FormValues = z.infer<typeof schema>;

export default function EditProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [serverError, setServerError] = useState('');

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      username: '',
      phone: '',
      bio: '',
    },
  });

  useEffect(() => {
    if (!profileQuery.data) return;

    reset({
      name: profileQuery.data.name,
      username: profileQuery.data.username,
      phone: profileQuery.data.phone,
      bio: profileQuery.data.bio,
    });
  }, [profileQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['my-profile'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['me'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['public-profile'],
        }),
      ]);

      router.replace('/me');
    },
    onError: (error) => {
      setServerError(getApiErrorMessage(error));
    },
  });

  function onSubmit(values: FormValues) {
    setServerError('');
    setAvatarError('');

    mutation.mutate({
      ...values,
      avatar,
    });
  }

  return (
    <main className='min-h-screen bg-black px-4 py-8 text-white'>
      <div className='mx-auto max-w-[620px]'>
        <Link
          href='/me'
          className='mb-7 inline-flex items-center gap-2 text-sm text-[#A4A7AE] hover:text-white'
        >
          <ArrowLeft className='size-4' />
          My Profile
        </Link>

        <h1 className='text-2xl font-semibold'>Edit Profile</h1>

        <p className='mt-2 text-sm text-[#A4A7AE]'>
          Update your Sociality account information.
        </p>

        {profileQuery.isPending ? (
          <p role='status' className='mt-8 text-sm text-[#A4A7AE]'>
            Loading your profile...
          </p>
        ) : profileQuery.isError ? (
          <div
            role='alert'
            className='mt-8 rounded-xl border border-white/10 p-5'
          >
            <p>{getApiErrorMessage(profileQuery.error)}</p>
            <button
              type='button'
              onClick={() => void profileQuery.refetch()}
              className='mt-3 text-[#A989FF]'
            >
              Retry
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className='mt-7 space-y-5 rounded-2xl border border-white/10 bg-[#0A0D12] p-5 sm:p-7'
          >
            {serverError && (
              <p role='alert' className='text-sm text-rose-400'>
                {serverError}
              </p>
            )}

            <div>
              <label
                htmlFor='edit-name'
                className='mb-2 block text-sm font-medium'
              >
                Full Name
              </label>
              <input
                id='edit-name'
                {...register('name')}
                className='h-11 w-full rounded-xl border border-white/10 bg-[#181D27] px-4 text-sm outline-none focus:border-[#6936F2]'
              />
              {errors.name && (
                <p className='mt-1 text-xs text-rose-400'>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='edit-username'
                className='mb-2 block text-sm font-medium'
              >
                Username
              </label>
              <input
                id='edit-username'
                {...register('username')}
                className='h-11 w-full rounded-xl border border-white/10 bg-[#181D27] px-4 text-sm outline-none focus:border-[#6936F2]'
              />
              {errors.username && (
                <p className='mt-1 text-xs text-rose-400'>
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='edit-phone'
                className='mb-2 block text-sm font-medium'
              >
                Phone
              </label>
              <input
                id='edit-phone'
                type='tel'
                {...register('phone')}
                className='h-11 w-full rounded-xl border border-white/10 bg-[#181D27] px-4 text-sm outline-none focus:border-[#6936F2]'
              />
              {errors.phone && (
                <p className='mt-1 text-xs text-rose-400'>
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='edit-bio'
                className='mb-2 block text-sm font-medium'
              >
                Bio
              </label>
              <textarea
                id='edit-bio'
                rows={4}
                {...register('bio')}
                className='w-full resize-y rounded-xl border border-white/10 bg-[#181D27] px-4 py-3 text-sm outline-none focus:border-[#6936F2]'
              />
              {errors.bio && (
                <p className='mt-1 text-xs text-rose-400'>
                  {errors.bio.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='edit-avatar'
                className='mb-2 block text-sm font-medium'
              >
                Profile Photo
              </label>
              <input
                id='edit-avatar'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;

                  setAvatarError('');

                  if (
                    file &&
                    !['image/jpeg', 'image/png', 'image/webp'].includes(
                      file.type
                    )
                  ) {
                    setAvatar(null);
                    setAvatarError('Choose JPG, PNG, or WebP.');
                    return;
                  }

                  if (file && file.size > 5 * 1024 * 1024) {
                    setAvatar(null);
                    setAvatarError('Image must be smaller than 5 MB.');
                    return;
                  }

                  setAvatar(file);
                }}
                className='block w-full text-xs text-[#A4A7AE] file:mr-4 file:rounded-full file:border-0 file:bg-[#6936F2] file:px-4 file:py-2 file:text-white'
              />

              {avatarError && (
                <p role='alert' className='mt-2 text-xs text-rose-400'>
                  {avatarError}
                </p>
              )}

              {avatar && (
                <p className='mt-2 text-xs text-[#A4A7AE]'>
                  Selected: {avatar.name}
                </p>
              )}
            </div>

            <div className='flex flex-wrap justify-end gap-3 pt-3'>
              <Link
                href='/me'
                className='inline-flex h-11 items-center rounded-full border border-white/15 px-6 text-sm hover:bg-white/10'
              >
                Cancel
              </Link>

              <button
                type='submit'
                disabled={mutation.isPending || Boolean(avatarError)}
                className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6936F2] px-6 text-sm font-semibold hover:bg-[#7F51F9] disabled:opacity-50'
              >
                {mutation.isPending ? (
                  <LoaderCircle className='size-4 animate-spin' />
                ) : (
                  <Save className='size-4' />
                )}
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
