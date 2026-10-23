'use client';

import {
  ArrowRight,
  Compass,
  Lightbulb,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type Feature = {
  title: string;
  description: string;
  icon: typeof Compass;
  background: string;
  iconBackground: string;
  iconColor: string;
};

const features: Feature[] = [
  {
    title: 'Find your next inspiration',
    description: 'Discover interesting posts and explore what people enjoy.',
    icon: Compass,
    background: 'bg-[#F4EEFF]',
    iconBackground: 'bg-[#E6D9FF]',
    iconColor: 'text-[#6936F2]',
  },
  {
    title: 'Make fair comparisons',
    description: 'Understand what the numbers mean before making decisions.',
    icon: Scale,
    background: 'bg-[#EAF9F5]',
    iconBackground: 'bg-[#CFF2E8]',
    iconColor: 'text-[#087F73]',
  },
  {
    title: 'Get fresh content ideas',
    description: 'Turn interesting patterns into creative experiments.',
    icon: Lightbulb,
    background: 'bg-[#FFF1E8]',
    iconBackground: 'bg-[#FFE1CB]',
    iconColor: 'text-[#C75B1B]',
  },
  {
    title: 'Know when to trust the data',
    description: 'See what we know, what is missing, and what needs more data.',
    icon: ShieldCheck,
    background: 'bg-[#EAF5FF]',
    iconBackground: 'bg-[#D5EAFF]',
    iconColor: 'text-[#2563EB]',
  },
];

export function CreatorPlaygroundWelcome() {
  return (
    <section
      aria-labelledby='creator-playground-title'
      className='relative overflow-hidden rounded-[28px] border border-[#E9E1FF] bg-[#F9F7FF] p-5 text-[#251348] shadow-sm sm:p-8 lg:p-10'
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#E6D9FF] opacity-70 blur-3xl'
      />

      <div
        aria-hidden='true'
        className='pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#DDF5EF] opacity-60 blur-3xl'
      />

      <div className='relative'>
        <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
          <span className='inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold tracking-wide text-[#6936F2] shadow-sm'>
            <Sparkles size={15} aria-hidden='true' />
            SOCIALITY CREATOR PLAYGROUND
          </span>

          <span
            aria-hidden='true'
            className='rounded-2xl bg-white p-3 text-2xl shadow-sm'
          >
            ✨
          </span>
        </div>

        <div className='max-w-3xl'>
          <h1
            id='creator-playground-title'
            className='text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl'
          >
            Hey, content creator!
            <span className='mt-2 block text-[#6936F2]'>
              This space is made for you.
            </span>
          </h1>

          <p className='mt-5 text-base leading-8 text-[#51466B] sm:text-lg'>
            Ever wondered what makes people like, comment on, or connect with a
            post? You are in the right place!
          </p>

          <p className='mt-3 max-w-2xl text-sm leading-7 text-[#655B78] sm:text-base'>
            Explore inspiring content, understand your posts, and discover fun
            ideas for what to create next. We turn complicated numbers into
            simple insights you can actually use.
          </p>

          <div className='mt-5 inline-flex items-center gap-2 rounded-full border border-[#DDD0FF] bg-white px-4 py-2 text-sm font-semibold text-[#6936F2]'>
            No data skills needed
            <span aria-hidden='true'>💜</span>
          </div>
        </div>

        <div className='mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className={`group rounded-2xl border border-white p-5 transition-transform duration-200 motion-safe:hover:-translate-y-1 ${feature.background}`}
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${feature.iconBackground}`}
                >
                  <Icon
                    size={23}
                    aria-hidden='true'
                    className={feature.iconColor}
                  />
                </div>

                <h2 className='text-base font-bold leading-6 text-[#251348]'>
                  {feature.title}
                </h2>

                <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className='mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E5DCFF] bg-white/90 p-4'>
          <span
            aria-hidden='true'
            className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E9FF] text-xl'
          >
            🚀
          </span>

          <div className='min-w-0 flex-1'>
            <p className='text-sm font-bold text-[#251348]'>
              Ready to explore?
            </p>
            <p className='text-xs leading-5 text-[#655B78]'>
              Start with Discover, then turn what you learn into your next
              creative experiment.
            </p>
          </div>

          <ArrowRight size={20} aria-hidden='true' className='text-[#6936F2]' />
        </div>
      </div>
    </section>
  );
}
