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
import { useAuth } from '@/components/auth/auth-provider';
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
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

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
    mode: 'onSubmit',
  });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (response) => {
      login(response.data.token, response.data.user);

      const requestedPath = searchParams.get('returnTo');
      const safePath =
        requestedPath?.startsWith('/') &&
        !requestedPath.startsWith('//') &&
        !requestedPath.startsWith('/\\')
          ? requestedPath
          : '/feed';

      router.replace(safePath);
      router.refresh();
    },
    onError: (error) => {
      setServerError(getApiErrorMessage(error));
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setServerError('');
    mutation.mutate(values);
  };

  return (
    <AuthShell title='Welcome Back!'>
      {searchParams.get('registered') === '1' && (
        <div
          role='status'
          className='mb-4 rounded-lg border border-[#079455]/30 bg-[#079455]/10 px-3 py-2.5 font-sans text-xs leading-5 text-emerald-300'
        >
          Account created successfully. Please log in.
        </div>
      )}

      {serverError && (
        <div
          role='alert'
          className='mb-4 rounded-lg border border-[#D9206E]/40 bg-[#D9206E]/10 px-3 py-2.5 font-sans text-xs leading-5 text-rose-300'
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className='space-y-5 font-sans'
      >
        <div className='space-y-1.5'>
          <Label htmlFor='email' className='text-[12px] font-medium text-white'>
            Email
          </Label>

          <Input
            id='email'
            type='email'
            placeholder='johndoe@email.com'
            autoComplete='email'
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className='h-10 rounded-[8px] border-white/[0.08] bg-[#0A0D12] px-3 font-sans text-[12px] text-white placeholder:text-[#717680] focus-visible:border-[#7F51F9] focus-visible:ring-[#7F51F9]/30'
            {...register('email')}
          />

          {errors.email && (
            <p
              id='login-email-error'
              role='alert'
              className='text-xs text-rose-400'
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label
            htmlFor='password'
            className='text-[12px] font-medium text-white'
          >
            Password
          </Label>

          <div className='relative'>
            <Input
              id='password'
              type={showPassword ? 'text' : 'password'}
              placeholder='Enter your password'
              autoComplete='current-password'
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'login-password-error' : undefined
              }
              className='h-10 rounded-[8px] border-white/[0.08] bg-[#0A0D12] px-3 pr-11 font-sans text-[12px] text-white placeholder:text-[#717680] focus-visible:border-[#7F51F9] focus-visible:ring-[#7F51F9]/30'
              {...register('password')}
            />

            <button
              type='button'
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className='absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[#A4A7AE] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#7F51F9]'
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {errors.password && (
            <p
              id='login-password-error'
              role='alert'
              className='text-xs text-rose-400'
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type='submit'
          disabled={mutation.isPending}
          className='mt-1 h-10 w-full rounded-full bg-[#6936F2] font-sans text-[12px] font-semibold text-white transition-colors hover:bg-[#7F51F9] focus-visible:ring-[#7F51F9] disabled:opacity-60'
        >
          {mutation.isPending ? (
            <>
              <LoaderCircle className='size-4 animate-spin' />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </Button>

        <p className='text-center font-sans text-[12px] leading-5 text-[#D5D7DA]'>
          Don&apos;t have an account?{' '}
          <Link
            href='/register'
            className='font-semibold text-[#A989FF] transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[#7F51F9]'
          >
            Register
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
