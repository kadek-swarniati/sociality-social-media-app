'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';

import AuthShell from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api/client';
import { registerUser } from '@/lib/api/auth';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must contain at least 3 characters.'),
  email: z.email('Enter a valid email address.'),
  phone: z.string().trim().min(8, 'Enter a valid phone number.'),
  password: z.string().min(8, 'Password must contain at least 8 characters.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      router.push('/login?registered=1');
    },
    onError: (error) => {
      setServerError(getApiErrorMessage(error));
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    setServerError('');
    mutation.mutate(values);
  };

  return (
    <AuthShell
      title='Create your account'
      description='Join Sociality and start sharing your moments with the people who matter.'
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className='space-y-5'>
        {serverError && (
          <div
            role='alert'
            className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'
          >
            {serverError}
          </div>
        )}

        <div className='space-y-2'>
          <Label htmlFor='name'>Full name</Label>
          <Input
            id='name'
            placeholder='Enter your full name'
            autoComplete='name'
            aria-invalid={!!errors.name}
            className='h-12 border-white/15 bg-white/5'
            {...register('name')}
          />
          {errors.name && (
            <p className='text-xs text-red-400'>{errors.name.message}</p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='username'>Username</Label>
          <Input
            id='username'
            placeholder='Choose a username'
            autoComplete='username'
            aria-invalid={!!errors.username}
            className='h-12 border-white/15 bg-white/5'
            {...register('username')}
          />
          {errors.username && (
            <p className='text-xs text-red-400'>{errors.username.message}</p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='email'>Email address</Label>
          <Input
            id='email'
            type='email'
            placeholder='you@example.com'
            autoComplete='email'
            aria-invalid={!!errors.email}
            className='h-12 border-white/15 bg-white/5'
            {...register('email')}
          />
          {errors.email && (
            <p className='text-xs text-red-400'>{errors.email.message}</p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='phone'>Phone number</Label>
          <Input
            id='phone'
            type='tel'
            placeholder='Enter your phone number'
            autoComplete='tel'
            aria-invalid={!!errors.phone}
            className='h-12 border-white/15 bg-white/5'
            {...register('phone')}
          />
          {errors.phone && (
            <p className='text-xs text-red-400'>{errors.phone.message}</p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='password'>Password</Label>

          <div className='relative'>
            <Input
              id='password'
              type={showPassword ? 'text' : 'password'}
              placeholder='Create a password'
              autoComplete='new-password'
              aria-invalid={!!errors.password}
              className='h-12 border-white/15 bg-white/5 pr-12'
              {...register('password')}
            />

            <button
              type='button'
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className='absolute top-1/2 right-4 -translate-y-1/2 text-zinc-400 hover:text-white'
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {errors.password && (
            <p className='text-xs text-red-400'>{errors.password.message}</p>
          )}
        </div>

        <Button
          type='submit'
          disabled={mutation.isPending}
          className='h-12 w-full rounded-xl bg-[#6D28D9] font-semibold text-white hover:bg-[#7C3AED]'
        >
          {mutation.isPending ? (
            <>
              <LoaderCircle className='mr-2 size-4 animate-spin' />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        <p className='text-center text-sm text-zinc-400'>
          Already have an account?{' '}
          <Link
            href='/login'
            className='font-semibold text-purple-400 hover:text-purple-300'
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
