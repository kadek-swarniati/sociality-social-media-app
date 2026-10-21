'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';

import AuthShell from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginUser } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/client';

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loginSucceeded, setLoginSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: () => {
      setLoginSucceeded(true);
    },
    onError: (error) => {
      setServerError(getApiErrorMessage(error));
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setServerError('');
    setLoginSucceeded(false);
    mutation.mutate(values);
  };

  return (
    <AuthShell
      title='Welcome back'
      description='Sign in to Sociality and reconnect with your community.'
    >
      {searchParams.get('registered') === '1' && (
        <div
          role='status'
          className='mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300'
        >
          Account created successfully. Please sign in.
        </div>
      )}

      {loginSucceeded && (
        <div
          role='status'
          className='mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300'
        >
          Login request succeeded. Session setup is the next step.
        </div>
      )}

      {serverError && (
        <div
          role='alert'
          className='mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className='space-y-6'>
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
          <Label htmlFor='password'>Password</Label>

          <div className='relative'>
            <Input
              id='password'
              type={showPassword ? 'text' : 'password'}
              placeholder='Enter your password'
              autoComplete='current-password'
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
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        <p className='text-center text-sm text-zinc-400'>
          Don&apos;t have an account?{' '}
          <Link
            href='/register'
            className='font-semibold text-purple-400 hover:text-purple-300'
          >
            Create an account
          </Link>
        </p>
      </form>

      <button
        type='button'
        onClick={() => router.push('/')}
        className='mt-8 block w-full text-center text-xs text-zinc-500 hover:text-white'
      >
        Back to home
      </button>
    </AuthShell>
  );
}
