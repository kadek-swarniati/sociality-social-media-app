'use client';

import {
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  comparePosts,
  type ComparisonPost,
} from '@/lib/insights/comparison-engine';

type Props = {
  posts: ComparisonPost[];
  partialCoverage: boolean;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function labelFor(post: ComparisonPost): string {
  const caption = post.caption.trim();

  return caption
    ? caption.length > 75
      ? `${caption.slice(0, 75)}…`
      : caption
    : `Post #${post.id}`;
}

export function FairComparison({ posts, partialCoverage }: Props) {
  const [firstId, setFirstId] = useState('');
  const [secondId, setSecondId] = useState('');
  const [showLimitations, setShowLimitations] = useState(true);

  const first = useMemo(
    () => posts.find((post) => String(post.id) === firstId) ?? null,
    [posts, firstId]
  );

  const second = useMemo(
    () => posts.find((post) => String(post.id) === secondId) ?? null,
    [posts, secondId]
  );

  const result = comparePosts(first, second);

  const choosePost = (value: string, setter: (value: string) => void) => {
    setter(value);
  };

  return (
    <section className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 text-[#25213B] shadow-sm sm:p-7'>
      <div className='flex items-start gap-3'>
        <div className='rounded-2xl bg-[#EEE8FF] p-3 text-[#6936F2]'>
          <Scale size={24} />
        </div>

        <div>
          <p className='text-xs font-bold uppercase tracking-wider text-[#6936F2]'>
            Improve your content
          </p>

          <h2 className='mt-2 text-2xl font-black'>
            Fair Comparison Studio ⚖️
          </h2>

          <p className='mt-3 text-sm leading-7 text-[#655B78]'>
            Compare two real posts and understand what the numbers can tell you.
            We will also explain what they cannot.
          </p>
        </div>
      </div>

      <div className='mt-6 grid gap-4 md:grid-cols-2'>
        {[
          {
            title: 'Post A',
            value: firstId,
            setter: setFirstId,
            background: 'bg-[#EEE8FF]',
          },
          {
            title: 'Post B',
            value: secondId,
            setter: setSecondId,
            background: 'bg-[#E5F7F6]',
          },
        ].map((field) => (
          <label
            key={field.title}
            className={`rounded-2xl p-5 ${field.background}`}
          >
            <span className='mb-3 block text-sm font-black'>{field.title}</span>

            <select
              value={field.value}
              onChange={(event) => choosePost(event.target.value, field.setter)}
              className='w-full rounded-xl border border-[#DDD5F4] bg-white p-3 text-sm outline-[#6936F2]'
            >
              <option value=''>Choose a post</option>

              {posts.map((post) => (
                <option key={post.id} value={String(post.id)}>
                  {labelFor(post)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {!result.valid ? (
        <div className='mt-5 rounded-2xl bg-[#F8F6FF] p-5'>
          <p className='text-sm text-[#655B78]'>{result.reason}</p>
        </div>
      ) : (
        <>
          <div className='mt-6 overflow-x-auto'>
            <table className='w-full min-w-[420px] text-left text-sm'>
              <thead>
                <tr className='border-b border-[#E9E5F4]'>
                  <th className='p-3'>Metric</th>
                  <th className='p-3'>Post A</th>
                  <th className='p-3'>Post B</th>
                  <th className='p-3'>Difference</th>
                </tr>
              </thead>

              <tbody>
                {result.metrics.map((metric) => (
                  <tr key={metric.label} className='border-b border-[#F0EDF6]'>
                    <td className='p-3 font-semibold'>{metric.label}</td>

                    <td className='p-3'>{formatNumber(metric.first)}</td>

                    <td className='p-3'>{formatNumber(metric.second)}</td>

                    <td className='p-3 font-bold text-[#6936F2]'>
                      {metric.difference > 0 ? '+' : ''}
                      {formatNumber(metric.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='mt-5 rounded-2xl bg-[#EEE8FF] p-5'>
            <div className='flex items-center gap-2 font-bold'>
              <ArrowLeftRight size={19} className='text-[#6936F2]' />
              What did we observe?
            </div>

            <p className='mt-3 text-sm leading-7 text-[#51466E]'>
              {result.conclusion}
            </p>

            <p className='mt-3 text-xs leading-6 text-[#655B78]'>
              This is a difference in raw recorded interactions, not an exposure
              adjusted performance difference.
            </p>
          </div>

          <div className='mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5'>
            <div className='flex items-center gap-2'>
              <AlertTriangle size={19} className='text-amber-800' />

              <h3 className='font-black text-amber-950'>Fairness check</h3>
            </div>

            <p className='mt-3 text-sm leading-7 text-amber-900'>
              The comparison is descriptive. There is not enough information to
              establish which post performed better after accounting for
              exposure and audience differences.
            </p>

            <button
              type='button'
              onClick={() => setShowLimitations((value) => !value)}
              aria-expanded={showLimitations}
              className='mt-4 text-sm font-bold text-amber-900 underline underline-offset-4'
            >
              {showLimitations ? 'Hide limitations' : 'Show limitations'}
            </button>

            {showLimitations && (
              <ul className='mt-4 space-y-3'>
                {result.warnings.map((warning) => (
                  <li
                    key={warning}
                    className='flex items-start gap-2 text-sm leading-6 text-amber-900'
                  >
                    <AlertTriangle size={15} className='mt-1 shrink-0' />
                    {warning}
                  </li>
                ))}

                {partialCoverage && (
                  <li className='flex items-start gap-2 text-sm leading-6 text-amber-900'>
                    <AlertTriangle size={15} className='mt-1 shrink-0' />
                    More API pages may be available. This comparison uses the
                    posts currently loaded.
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className='mt-5 flex items-center gap-2 rounded-xl bg-[#E5F7F6] p-4 text-sm text-[#22635E]'>
            <CheckCircle2 size={18} />
            You can use this observation to design your next content experiment.
          </div>
        </>
      )}

      <p className='mt-5 text-xs leading-6 text-[#736C82]'>
        Source: currently loaded Sociality API posts. Counts are observational
        and may change after refresh.
      </p>
    </section>
  );
}
