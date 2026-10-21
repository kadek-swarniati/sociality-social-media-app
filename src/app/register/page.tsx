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

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name.'),
    username: z
      .string()
      .trim()
      .min(3, 'Username must contain at least 3 characters.'),
    email: z.email('Enter a valid email address.'),
    phone: z.string().trim().min(8, 'Enter a valid phone number.'),
    password: z.string().min(8, 'Password must contain at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      confirmPassword: '',
    },
    mode: 'onSubmit',
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

    mutation.mutate({
      name: values.name.trim(),
      username: values.username.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      password: values.password,
    });
  };

  const inputClassName =
    'h-10 rounded-[8px] border-white/[0.08] bg-[#0A0D12] px-3 font-sans text-[12px] text-white placeholder:text-[#717680] focus-visible:border-[#7F51F9] focus-visible:ring-[#7F51F9]/30';

  const labelClassName = 'text-[12px] font-medium text-white';

  return (
    <AuthShell title='Create your account'>
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
        className='space-y-3.5 font-sans'
      >
        <div className='space-y-1.5'>
          <Label htmlFor='register-name' className={labelClassName}>
            Name
          </Label>

          <Input
            id='register-name'
            placeholder='Enter your name'
            autoComplete='name'
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'register-name-error' : undefined}
            className={inputClassName}
            {...register('name')}
          />

          {errors.name && (
            <p
              id='register-name-error'
              role='alert'
              className='text-xs text-rose-400'
            >
              {errors.name.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='register-username' className={labelClassName}>
            Username
          </Label>

          <Input
            id='register-username'
            placeholder='Enter your username'
            autoComplete='username'
            aria-invalid={!!errors.username}
            aria-describedby={
              errors.username ? 'register-username-error' : undefined
            }
            className={inputClassName}
            {...register('username')}
          />

          {errors.username && (
            <p
              id='register-username-error'
              role='alert'
              className='text-xs text-rose-400'
            >
              {errors.username.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='register-email' className={labelClassName}>
            Email
          </Label>

          <Input
            id='register-email'
            type='email'
            placeholder='Enter your email'
            autoComplete='email'
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            className={inputClassName}
            {...register('email')}
          />

          {errors.email && (
            <p
              id='register-email-error'
              role='alert'
              className='text-xs text-rose-400'
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='register-phone' className={labelClassName}>
            WhatsApp Number
          </Label>

          <Input
            id='register-phone'
            type='tel'
            placeholder='Enter your WhatsApp number'
            autoComplete='tel'
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'register-phone-error' : undefined}
            className={inputClassName}
            {...register('phone')}
          />

          {errors.phone && (
            <p
              id='register-phone-error'
              role='alert'
              className='text-xs text-rose-400'
            >
              {errors.phone.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='register-password' className={labelClassName}>
            Password
          </Label>

          <div className='relative'>
            <Input
              id='register-password'
              type={showPassword ? 'text' : 'password'}
              placeholder='Create your password'
              autoComplete='new-password'
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'register-password-error' : undefined
              }
              className={`${inputClassName} pr-11`}
              {...register('password')}
            />

            <button
              type='button'
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className='absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[#A4A7AE] hover:text-white focus-visible:outline-2 focus-visible:outline-[#7F51F9]'
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {errors.password && (
            <p
              id='register-password-error'
              role='alert'
              className='text-xs text-rose-400'
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='register-confirm-password' className={labelClassName}>
            Confirm Password
          </Label>

          <div className='relative'>
            <Input
              id='register-confirm-password'
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder='Confirm your password'
              autoComplete='new-password'
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={
                errors.confirmPassword
                  ? 'register-confirm-password-error'
                  : undefined
              }
              className={`${inputClassName} pr-11`}
              {...register('confirmPassword')}
            />

            <button
              type='button'
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={
                showConfirmPassword
                  ? 'Hide confirmation password'
                  : 'Show confirmation password'
              }
              aria-pressed={showConfirmPassword}
              className='absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[#A4A7AE] hover:text-white focus-visible:outline-2 focus-visible:outline-[#7F51F9]'
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {errors.confirmPassword && (
            <p
              id='register-confirm-password-error'
              role='alert'
              className='text-xs text-rose-400'
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type='submit'
          disabled={mutation.isPending}
          className='mt-2 h-10 w-full rounded-full bg-[#6936F2] font-sans text-[12px] font-semibold text-white hover:bg-[#7F51F9] focus-visible:ring-[#7F51F9] disabled:opacity-60'
        >
          {mutation.isPending ? (
            <>
              <LoaderCircle className='size-4 animate-spin' />
              Creating account...
            </>
          ) : (
            'Register'
          )}
        </Button>

        <p className='pt-1 text-center font-sans text-[12px] leading-5 text-[#D5D7DA]'>
          Already have an account?{' '}
          <Link
            href='/login'
            className='font-semibold text-[#A989FF] hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[#7F51F9]'
          >
            Login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
