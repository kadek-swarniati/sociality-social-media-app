'use client';

import {
  CheckCircle2,
  ClipboardCopy,
  FlaskConical,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  createInsightSummary,
  getCreatorRecommendations,
  getDistribution,
  type CreatorPost,
  type DataAudit,
} from '@/lib/insights/creator-intelligence';

type Props = {
  posts: CreatorPost[];
  audit: DataAudit;
};

const CHALLENGES = [
  {
    id: 'hook',
    title: 'The Hook Remix',
    emoji: '⚡',
    prompt: 'Draft two different opening lines for one topic.',
  },
  {
    id: 'conversation',
    title: 'Start a Conversation',
    emoji: '💬',
    prompt: 'Ask a genuine question and document the response.',
  },
  {
    id: 'story',
    title: 'Tell a Tiny Story',
    emoji: '🌷',
    prompt: 'Share a real moment and one thing you learned.',
  },
] as const;

export function CreatorIntelligenceSuite({ posts, audit }: Props) {
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(
    null
  );
  const [notes, setNotes] = useState('');
  const [completed, setCompleted] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState('');

  const recommendations = useMemo(
    () => getCreatorRecommendations(posts, audit),
    [posts, audit]
  );

  const distribution = useMemo(() => getDistribution(posts), [posts]);

  const maxCount = Math.max(1, ...distribution.map((item) => item.count));

  const missingPercent =
    audit.uniqueCount > 0 ? (audit.missing / audit.uniqueCount) * 100 : null;

  const selected = CHALLENGES.find(
    (challenge) => challenge.id === selectedChallenge
  );

  const copySummary = async () => {
    const summary = createInsightSummary(posts, audit);

    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('Insight summary copied.');
    } catch {
      setCopyStatus('Copy failed. Please check clipboard permissions.');
    }
  };

  const toggleCompleted = (id: string) => {
    setCompleted((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  return (
    <div className='space-y-6'>
      <section className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 shadow-sm sm:p-7'>
        <div className='flex items-center gap-3'>
          <Lightbulb className='text-[#6936F2]' />
          <h2 className='text-xl font-black text-[#25213B]'>
            Your Next Move 2.0 💡
          </h2>
        </div>

        <p className='mt-3 text-sm leading-7 text-[#655B78]'>
          Explore testable content ideas. Every suggestion explains its evidence
          and limitations.
        </p>

        <div className='mt-5 grid gap-4 lg:grid-cols-3'>
          {recommendations.map((item) => (
            <article
              key={item.id}
              className='rounded-2xl border border-[#E9E5F4] bg-[#FBFAFF] p-5'
            >
              <h3 className='font-black text-[#25213B]'>{item.title}</h3>

              <p className='mt-3 text-sm leading-6 text-[#51466E]'>
                {item.action}
              </p>

              <div className='mt-4 rounded-xl bg-white p-3'>
                <p className='text-xs font-bold text-[#6936F2]'>
                  Why this idea?
                </p>
                <p className='mt-2 text-xs leading-6 text-[#655B78]'>
                  {item.explanation}
                </p>
              </div>

              <p className='mt-3 text-xs leading-6 text-[#655B78]'>
                <strong>Evidence scope:</strong> {item.evidence}
              </p>

              <p className='mt-3 text-xs leading-6 text-amber-800'>
                <strong>Remember:</strong> {item.caution}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 shadow-sm sm:p-7'>
        <div className='flex items-center gap-3'>
          <FlaskConical className='text-[#6936F2]' />
          <h2 className='text-xl font-black text-[#25213B]'>
            Creator Challenges 2.0 🎯
          </h2>
        </div>

        <p className='mt-3 text-sm leading-7 text-[#655B78]'>
          Choose an experiment, write your plan, and mark your own progress.
          Notes remain in this page session and are not sent to the API.
        </p>

        <div className='mt-5 grid gap-3 md:grid-cols-3'>
          {CHALLENGES.map((challenge) => {
            const isSelected = selectedChallenge === challenge.id;
            const isComplete = completed.includes(challenge.id);

            return (
              <button
                key={challenge.id}
                type='button'
                onClick={() => {
                  setSelectedChallenge(challenge.id);
                  setNotes('');
                }}
                aria-pressed={isSelected}
                className={`rounded-2xl border p-5 text-left ${
                  isSelected
                    ? 'border-[#6936F2] bg-[#EEE8FF]'
                    : 'border-[#E9E5F4] bg-[#FBFAFF]'
                }`}
              >
                <span className='text-2xl'>{challenge.emoji}</span>

                <h3 className='mt-3 font-bold text-[#25213B]'>
                  {challenge.title}
                </h3>

                <p className='mt-2 text-sm text-[#655B78]'>
                  {challenge.prompt}
                </p>

                {isComplete && (
                  <span className='mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700'>
                    <CheckCircle2 size={15} />
                    Self-reported complete
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className='mt-5 rounded-2xl bg-[#F8F6FF] p-5'>
            <h3 className='font-bold text-[#25213B]'>
              Your experiment: {selected.title}
            </h3>

            <label className='mt-4 block'>
              <span className='text-sm font-semibold text-[#51466E]'>
                My experiment plan
              </span>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder='What will you try? What will you observe?'
                className='mt-2 w-full rounded-xl border border-[#DDD5F4] bg-white p-3 text-sm outline-[#6936F2]'
              />
            </label>

            <p className='mt-2 text-xs text-[#736C82]'>
              Notes are temporary and are not automatically saved.
            </p>

            <button
              type='button'
              onClick={() => toggleCompleted(selected.id)}
              className='mt-4 rounded-xl bg-[#6936F2] px-4 py-2 text-sm font-bold text-white'
            >
              {completed.includes(selected.id)
                ? 'Mark as not completed'
                : 'Mark as completed'}
            </button>
          </div>
        )}
      </section>

      <section className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 shadow-sm sm:p-7'>
        <div className='flex items-center gap-3'>
          <ShieldCheck className='text-[#6936F2]' />
          <h2 className='text-xl font-black text-[#25213B]'>
            Data Quality Center 2.0 🛡️
          </h2>
        </div>

        <div className='mt-5 grid grid-cols-2 gap-3 md:grid-cols-3'>
          {[
            ['Rows fetched', audit.rawCount],
            ['Unique posts', audit.uniqueCount],
            ['Duplicate rows', audit.duplicates],
            ['Incomplete posts', audit.missing],
            ['Pages loaded', audit.pagesLoaded],
            ['Analyzed posts', posts.length],
          ].map(([label, value]) => (
            <div key={String(label)} className='rounded-2xl bg-[#F8F6FF] p-4'>
              <p className='text-xs text-[#655B78]'>{label}</p>
              <p className='mt-2 text-2xl font-black text-[#25213B]'>{value}</p>
            </div>
          ))}
        </div>

        <p className='mt-5 text-sm leading-7 text-[#51466E]'>
          Missing interaction counts:{' '}
          <strong>
            {missingPercent === null
              ? 'Not available'
              : `${missingPercent.toFixed(1)}%`}
          </strong>{' '}
          of unique loaded posts.
        </p>

        <p className='mt-2 text-sm leading-7 text-[#655B78]'>
          {audit.partialCoverage
            ? 'More pages may be available. Findings describe only the loaded subset.'
            : 'No further page is reported for this query. This does not prove platform-wide coverage.'}
        </p>

        <p className='mt-3 text-xs leading-6 text-[#736C82]'>
          Duplicate rows are identified by post ID. Posts without valid likes
          and comments are excluded from interaction analysis, not assigned zero
          values.
        </p>
      </section>

      <section className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 shadow-sm sm:p-7'>
        <h2 className='text-xl font-black text-[#25213B]'>
          Interaction Distribution 🌈
        </h2>

        <p className='mt-3 text-sm leading-7 text-[#655B78]'>
          Explore the distribution of recorded interactions among analyzed
          posts. Quartiles are calculated from the loaded data.
        </p>

        {distribution.length === 0 ? (
          <p className='mt-5 text-sm text-[#655B78]'>
            No complete posts are available yet.
          </p>
        ) : (
          <div className='mt-5 space-y-4'>
            {distribution.map((item) => (
              <div key={item.label}>
                <div className='mb-2 flex justify-between gap-3 text-sm'>
                  <span className='font-semibold text-[#51466E]'>
                    {item.label}
                  </span>
                  <span className='text-[#655B78]'>{item.count} posts</span>
                </div>

                <div className='h-4 overflow-hidden rounded-full bg-[#EEE8FF]'>
                  <div
                    className='h-full rounded-full bg-[#6936F2]'
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className='mt-4 text-xs leading-6 text-[#736C82]'>
          Quartile groups can be uneven when multiple posts share the same
          interaction counts.
        </p>
      </section>

      <section className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 shadow-sm sm:p-7'>
        <h2 className='text-xl font-black text-[#25213B]'>
          Share Your Insight ✨
        </h2>

        <p className='mt-3 text-sm leading-7 text-[#655B78]'>
          Copy a descriptive summary of the loaded dataset. Individual captions
          and author names are excluded.
        </p>

        <button
          type='button'
          onClick={() => void copySummary()}
          className='mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6936F2] px-5 py-3 text-sm font-bold text-white'
        >
          <ClipboardCopy size={17} />
          Copy insight summary
        </button>

        <p
          role='status'
          aria-live='polite'
          className='mt-3 text-sm text-[#51466E]'
        >
          {copyStatus}
        </p>
      </section>
    </div>
  );
}
