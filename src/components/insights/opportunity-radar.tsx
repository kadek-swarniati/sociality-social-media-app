'use client';

import {
  ArrowRight,
  ChevronDown,
  Compass,
  Lightbulb,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  buildOpportunityRadar,
  type RadarPost,
} from '@/lib/insights/opportunity-engine';

type Props = {
  posts: RadarPost[];
  partialCoverage: boolean;
  onSelectPost: (id: number) => void;
};

const CARD_COLORS: Record<string, string> = {
  amber: 'border-amber-200 bg-amber-50',
  pink: 'border-pink-200 bg-pink-50',
  sky: 'border-sky-200 bg-sky-50',
  violet: 'border-violet-200 bg-violet-50',
};

function formatCount(value: number | null): string {
  if (value === null) {
    return 'Not available';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}

export function OpportunityRadar({
  posts,
  partialCoverage,
  onSelectPost,
}: Props) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [showMethod, setShowMethod] = useState(false);

  const insights = useMemo(
    () => buildOpportunityRadar(posts, partialCoverage),
    [posts, partialCoverage]
  );

  const active = insights.filter((insight) => insight.count > 0);

  const selected = insights.find(
    (insight) => insight.topic.id === selectedTopic
  );

  const evidence = selected
    ? selected.evidence.filter((item) =>
        `${item.post.caption} ${item.post.author}`
          .toLowerCase()
          .includes(search.toLowerCase().trim())
      )
    : [];

  const totalMatches = active.reduce((sum, item) => sum + item.count, 0);

  const handleSelectPost = (id: number) => {
    onSelectPost(id);

    const target = document.getElementById('creator-post-explorer');

    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <section
      aria-labelledby='radar-heading'
      className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 shadow-sm sm:p-7'
    >
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='max-w-2xl'>
          <p className='text-xs font-bold uppercase tracking-wider text-[#6936F2]'>
            Discover something new
          </p>

          <h2
            id='radar-heading'
            className='mt-2 text-2xl font-black tracking-tight text-[#25213B]'
          >
            Your Creator Opportunity Radar 🔭
          </h2>

          <p className='mt-3 text-sm leading-7 text-[#655B78]'>
            Looking for your next big idea? Explore what people are sharing on
            Sociality. Choose a theme, read real posts, and find something that
            sparks your creativity.
          </p>
        </div>

        <div className='rounded-2xl bg-[#F3EEFF] px-4 py-3 text-center'>
          <p className='text-2xl font-black text-[#6936F2]'>{active.length}</p>

          <p className='text-xs font-semibold text-[#51466E]'>Themes found</p>
        </div>
      </div>

      <div className='mt-5 flex flex-wrap gap-2'>
        <span className='rounded-full bg-[#EEE8FF] px-3 py-2 text-xs font-bold text-[#51466E]'>
          {posts.length} posts analyzed
        </span>

        <span className='rounded-full bg-[#E5F7F6] px-3 py-2 text-xs font-bold text-[#22635E]'>
          {totalMatches} theme matches
        </span>

        <span className='rounded-full bg-[#FFF2DF] px-3 py-2 text-xs font-bold text-[#855812]'>
          {partialCoverage
            ? 'More posts may be available'
            : 'Current loaded pages checked'}
        </span>
      </div>

      <p className='mt-3 text-xs leading-6 text-[#736C82]'>
        One post can match several themes, so theme matches may exceed the
        number of posts.
      </p>

      {active.length === 0 ? (
        <div className='mt-6 rounded-2xl bg-[#F8F6FF] p-6'>
          <p className='font-bold text-[#25213B]'>
            Your inspiration garden is still growing 🌱
          </p>

          <p className='mt-2 text-sm leading-7 text-[#655B78]'>
            We have not found a clear keyword match in these captions yet. Try
            exploring more community posts.
          </p>
        </div>
      ) : (
        <div className='mt-6 grid gap-4 md:grid-cols-2'>
          {active.map((insight) => {
            const isSelected = selectedTopic === insight.topic.id;

            return (
              <button
                key={insight.topic.id}
                type='button'
                onClick={() => {
                  setSelectedTopic(isSelected ? null : insight.topic.id);
                  setSearch('');
                }}
                aria-pressed={isSelected}
                className={`rounded-[22px] border p-5 text-left transition-all duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6936F2] ${
                  CARD_COLORS[insight.topic.color] ??
                  'border-[#E9E5F4] bg-[#F8F6FF]'
                } ${isSelected ? 'ring-2 ring-[#6936F2]' : 'hover:shadow-md'}`}
              >
                <div className='flex items-start justify-between gap-3'>
                  <span className='text-3xl' aria-hidden='true'>
                    {insight.topic.emoji}
                  </span>

                  <span className='rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#51466E]'>
                    {insight.count} posts
                  </span>
                </div>

                <h3 className='mt-4 text-lg font-black text-[#25213B]'>
                  {insight.topic.title}
                </h3>

                <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                  {insight.topic.description}
                </p>

                <div className='mt-4 grid grid-cols-2 gap-2'>
                  <div className='rounded-xl bg-white/80 p-3'>
                    <p className='text-xs text-[#655B78]'>Typical likes</p>

                    <p className='mt-1 text-lg font-black text-[#25213B]'>
                      {formatCount(insight.medianLikes)}
                    </p>
                  </div>

                  <div className='rounded-xl bg-white/80 p-3'>
                    <p className='text-xs text-[#655B78]'>Typical comments</p>

                    <p className='mt-1 text-lg font-black text-[#25213B]'>
                      {formatCount(insight.medianComments)}
                    </p>
                  </div>
                </div>

                <p className='mt-3 text-xs font-semibold text-[#655B78]'>
                  {insight.evidenceLabel}
                </p>

                <p className='mt-4 flex items-center gap-2 text-sm font-bold text-[#6936F2]'>
                  {isSelected ? 'Hide examples' : 'Explore these posts'}

                  <ArrowRight size={16} />
                </p>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className='mt-6 rounded-[22px] border border-[#DCD1FA] bg-[#FBFAFF] p-5 sm:p-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <p className='text-xs font-bold text-[#6936F2]'>
                LET&apos;S EXPLORE
              </p>

              <h3 className='mt-2 text-xl font-black text-[#25213B]'>
                {selected.topic.emoji} {selected.topic.title}
              </h3>

              <p className='mt-2 text-sm text-[#655B78]'>
                These posts contain keywords associated with this theme.
              </p>
            </div>

            <button
              type='button'
              onClick={() => {
                setSelectedTopic(null);
                setSearch('');
              }}
              className='rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#6936F2]'
            >
              Close
            </button>
          </div>

          <div className='mt-5 grid gap-3 sm:grid-cols-3'>
            {[
              {
                label: 'Median interactions',
                value: selected.medianInteractions,
              },
              {
                label: 'Median without top post',
                value: selected.medianWithoutTopPost,
              },
              {
                label: 'Change in median',
                value: selected.sensitivityDifference,
              },
            ].map((metric) => (
              <div key={metric.label} className='rounded-xl bg-white p-4'>
                <p className='text-xs text-[#655B78]'>{metric.label}</p>

                <p className='mt-2 text-xl font-black text-[#25213B]'>
                  {formatCount(metric.value)}
                </p>
              </div>
            ))}
          </div>

          <div className='mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4'>
            <ShieldCheck size={18} className='mt-0.5 shrink-0 text-amber-800' />

            <div>
              <p className='text-sm font-bold text-amber-950'>
                What should I know?
              </p>

              <p className='mt-1 text-sm leading-6 text-amber-900'>
                {selected.caution}
              </p>
            </div>
          </div>

          <label className='mt-5 flex items-center gap-3 rounded-xl border border-[#E4DCF8] bg-white px-4 py-3'>
            <Search size={18} className='text-[#736C82]' />

            <input
              type='search'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Find a post in this theme'
              aria-label='Search posts in selected theme'
              className='min-w-0 flex-1 bg-transparent text-sm text-[#25213B] outline-none'
            />
          </label>

          <div className='mt-4 max-h-[500px] space-y-3 overflow-y-auto'>
            {evidence.length === 0 && (
              <p className='rounded-xl bg-white p-4 text-sm text-[#655B78]'>
                No posts match your search.
              </p>
            )}

            {evidence.map((item) => (
              <div
                key={item.post.id}
                className='rounded-xl border border-[#EBE7F3] bg-white p-4'
              >
                <p className='line-clamp-3 break-words text-sm font-semibold leading-6 text-[#25213B]'>
                  {item.post.caption || `Post #${item.post.id}`}
                </p>

                <p className='mt-2 text-xs text-[#736C82]'>
                  By {item.post.author}
                </p>

                <div className='mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#51466E]'>
                  <span>💜 {item.post.likes} likes</span>

                  <span>💬 {item.post.comments} comments</span>
                </div>

                <p className='mt-3 text-xs leading-5 text-[#736C82]'>
                  Matched words: {item.matchedKeywords.join(', ')}
                </p>

                <button
                  type='button'
                  onClick={() => handleSelectPost(item.post.id)}
                  className='mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#6936F2] hover:underline'
                >
                  Open in Post Explorer
                  <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='mt-6 border-t border-[#EEEAF5] pt-5'>
        <button
          type='button'
          onClick={() => setShowMethod((value) => !value)}
          aria-expanded={showMethod}
          className='inline-flex items-center gap-2 text-sm font-bold text-[#6936F2]'
        >
          <Lightbulb size={17} />
          Why am I seeing these themes?
          <ChevronDown
            size={16}
            className={`transition-transform motion-reduce:transition-none ${
              showMethod ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showMethod && (
          <div className='mt-4 rounded-2xl bg-[#F8F6FF] p-5 text-sm leading-7 text-[#51466E]'>
            <div className='mb-3 flex items-center gap-2 font-bold'>
              <Compass size={18} />
              How your Radar works
            </div>

            <p>
              We read captions from the posts currently loaded through the
              Sociality API. We look for predefined keywords associated with
              different content themes.
            </p>

            <p className='mt-3'>
              A post can belong to more than one theme. We calculate median
              recorded likes, comments, and interactions from matching posts.
            </p>

            <p className='mt-3'>
              We also remove the highest interaction post temporarily to see how
              much the median changes. This is a simple sensitivity check, not a
              statistical confidence interval.
            </p>

            <p className='mt-3'>
              These findings cannot predict viral success or measure engagement
              rate because reach and impressions are not available.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
