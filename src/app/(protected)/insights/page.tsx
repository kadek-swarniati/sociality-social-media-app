'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  Database,
  Heart,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { getMyPostList } from '@/lib/api/account';
import { api } from '@/lib/api/client';

type Mode = 'personal' | 'community';
type SortBy = 'total' | 'likes' | 'comments';
type JsonObject = Record<string, unknown>;

type Post = {
  id: number;
  caption: string;
  author: string;
  likes: number | null;
  comments: number | null;
};

type Page = {
  items: Post[];
  hasNextPage: boolean;
};

type CompletePost = Post & {
  likes: number;
  comments: number;
  total: number;
};

const PAGE_SIZE = 12;
const MAX_PAGES = 20;
const PURPLE = '#6936F2';
const CYAN = '#0891B2';

function obj(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function count(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function parseCommunity(value: unknown, page: number): Page {
  const root = obj(value);

  if (root.success === false) {
    throw new Error(str(root.message) || 'Unable to load posts.');
  }

  const data = root.data ?? value;
  const payload = obj(data);

  const candidates: unknown[] = [
    data,
    payload.items,
    payload.posts,
    payload.results,
    root.items,
    root.posts,
  ];

  const raw = candidates.find(Array.isArray);

  if (!Array.isArray(raw)) {
    throw new Error('Unexpected posts response format.');
  }

  const items: Post[] = raw.map((entry: unknown) => {
    const post = obj(entry);
    const author = obj(post.author ?? post.user);
    const id = Number(post.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('Invalid post ID.');
    }

    return {
      id,
      caption: str(post.caption) || str(post.content),
      author: str(author.username) || str(author.name) || 'Sociality User',
      likes: count(post.likeCount ?? post.likesCount ?? post.likes_count),
      comments: count(
        post.commentCount ?? post.commentsCount ?? post.comments_count
      ),
    };
  });

  const pagination = obj(payload.pagination ?? root.pagination);

  const totalPages = Number(
    pagination.totalPages ?? pagination.total_pages ?? payload.totalPages
  );

  const explicit =
    pagination.hasNextPage ?? pagination.hasNext ?? payload.hasNextPage;

  return {
    items,
    hasNextPage:
      typeof explicit === 'boolean'
        ? explicit
        : Number.isFinite(totalPages) && totalPages > 0
          ? page < totalPages
          : items.length === PAGE_SIZE,
  };
}

async function fetchPosts(mode: Mode, page: number): Promise<Page> {
  if (mode === 'personal') {
    const result = await getMyPostList('posts', page, PAGE_SIZE);

    return {
      items: result.items.map((post) => ({
        id: post.id,
        caption: post.caption,
        author: 'You',
        likes: post.likesCount,
        comments: post.commentsCount,
      })),
      hasNextPage: result.hasNextPage,
    };
  }

  const response = await api.get<unknown>('/posts', {
    params: { page, limit: PAGE_SIZE },
  });

  return parseCommunity(response.data, page);
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function label(post: Post): string {
  const text = post.caption.trim();
  return text
    ? text.slice(0, 48) + (text.length > 48 ? '…' : '')
    : `Post #${post.id}`;
}

function gini(values: number[]): number | null {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  if (sum === 0) return null;

  const weighted = sorted.reduce(
    (acc, value, index) => acc + value * (index + 1),
    0
  );

  return (
    (2 * weighted) / (sorted.length * sum) - (sorted.length + 1) / sorted.length
  );
}

function median(values: number[]): number | null {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className='rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-950 shadow-sm sm:p-7'>
      <h2 className='text-xl font-bold tracking-tight'>{title}</h2>
      <p className='mt-1 mb-6 text-sm leading-6 text-neutral-600'>
        {description}
      </p>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className='rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-950 shadow-sm'>
      <p className='text-sm font-medium text-neutral-600'>{title}</p>
      <p className='mt-2 text-3xl font-bold tracking-tight'>{value}</p>
      <p className='mt-2 text-xs leading-5 text-neutral-600'>{detail}</p>
    </div>
  );
}

function RankedBars({
  posts,
  selectedId,
  onSelect,
  sortBy,
}: {
  posts: CompletePost[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  sortBy: SortBy;
}) {
  const ranked = [...posts]
    .sort((a, b) => b[sortBy] - a[sortBy] || a.id - b.id)
    .slice(0, 10);

  const max = Math.max(1, ...ranked.map((p) => p.total));

  if (!ranked.length) {
    return <p className='text-neutral-600'>No posts to compare yet.</p>;
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-4 text-xs text-neutral-700'>
        <span>🟣 Likes</span>
        <span>🔵 Comments</span>
      </div>

      {ranked.map((post) => (
        <button
          key={post.id}
          type='button'
          onClick={() => onSelect(post.id)}
          aria-pressed={selectedId === post.id}
          className={`w-full rounded-xl p-3 text-left transition focus-visible:outline-2 focus-visible:outline-violet-600 ${
            selectedId === post.id
              ? 'bg-violet-50 ring-2 ring-violet-300'
              : 'hover:bg-neutral-50'
          }`}
        >
          <div className='mb-2 flex items-start justify-between gap-3 text-sm'>
            <span className='min-w-0 break-words font-medium'>
              {label(post)}
            </span>
            <span className='shrink-0 font-bold'>{fmt(post[sortBy])}</span>
          </div>

          <div className='flex h-3 overflow-hidden rounded-full bg-neutral-100'>
            <div
              className='bg-[#6936F2]'
              style={{ width: `${(post.likes / max) * 100}%` }}
            />
            <div
              className='bg-[#0891B2]'
              style={{ width: `${(post.comments / max) * 100}%` }}
            />
          </div>

          <p className='mt-2 text-xs text-neutral-600'>
            {post.likes} likes · {post.comments} comments
          </p>
        </button>
      ))}
    </div>
  );
}

function BubbleChart({
  posts,
  selectedId,
  onSelect,
}: {
  posts: CompletePost[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { likes: number; comments: number; posts: CompletePost[] }
    >();

    for (const post of posts) {
      const key = `${post.likes}:${post.comments}`;
      const current = map.get(key);

      if (current) {
        current.posts.push(post);
      } else {
        map.set(key, {
          likes: post.likes,
          comments: post.comments,
          posts: [post],
        });
      }
    }

    return [...map.values()];
  }, [posts]);

  if (!posts.length) {
    return <p className='text-sm text-neutral-600'>No data yet.</p>;
  }

  const width = 680;
  const height = 330;
  const left = 55;
  const top = 30;
  const plotWidth = 580;
  const plotHeight = 240;

  const maxLikes = Math.max(1, ...posts.map((p) => p.likes));
  const maxComments = Math.max(1, ...posts.map((p) => p.comments));
  const maxGroup = Math.max(1, ...groups.map((g) => g.posts.length));

  const x = (value: number) => left + (value / maxLikes) * plotWidth;

  const y = (value: number) =>
    top + plotHeight - (value / maxComments) * plotHeight;

  return (
    <div>
      <div className='overflow-x-auto'>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className='w-full min-w-[360px]'
          role='img'
          aria-label='Bubble chart. Horizontal position shows likes, vertical position shows comments, and bubble size shows how many posts share those counts.'
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1={left}
                x2={left + plotWidth}
                y1={y(maxComments * fraction)}
                y2={y(maxComments * fraction)}
                stroke='#E5E7EB'
              />
              <text
                x={left - 9}
                y={y(maxComments * fraction) + 4}
                textAnchor='end'
                fontSize='11'
                fill='#525252'
              >
                {Number((maxComments * fraction).toFixed(1))}
              </text>
            </g>
          ))}

          <text
            x={left + plotWidth / 2}
            y={height - 14}
            textAnchor='middle'
            fontSize='13'
            fill='#404040'
          >
            Likes
          </text>

          <text x={left} y={15} fontSize='13' fill='#404040'>
            Comments
          </text>

          <text
            x={left + plotWidth}
            y={top + plotHeight + 20}
            textAnchor='end'
            fontSize='11'
            fill='#525252'
          >
            {maxLikes}
          </text>

          {groups.map((group) => {
            const selected = group.posts.some((post) => post.id === selectedId);

            const radius = 8 + 19 * Math.sqrt(group.posts.length / maxGroup);

            return (
              <g key={`${group.likes}:${group.comments}`}>
                <circle
                  cx={x(group.likes)}
                  cy={y(group.comments)}
                  r={radius}
                  fill={selected ? CYAN : PURPLE}
                  fillOpacity={0.78}
                  stroke={selected ? '#164E63' : '#FFFFFF'}
                  strokeWidth={selected ? 3 : 2}
                >
                  <title>
                    {`${group.posts.length} posts: ${group.likes} likes and ${group.comments} comments each`}
                  </title>
                </circle>

                <text
                  x={x(group.likes)}
                  y={y(group.comments) + 4}
                  textAnchor='middle'
                  fontSize='12'
                  fontWeight='bold'
                  fill='#FFFFFF'
                >
                  {group.posts.length}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className='mt-2 text-sm leading-6 text-neutral-700'>
        Each bubble represents posts with the same likes and comments. The
        number inside shows how many posts share that combination.
      </p>

      <div className='mt-4 flex flex-wrap gap-2'>
        {groups.map((group) => (
          <button
            key={`${group.likes}-${group.comments}`}
            type='button'
            onClick={() => onSelect(group.posts[0].id)}
            className='rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-800 hover:border-violet-500 focus-visible:outline-2 focus-visible:outline-violet-600'
          >
            {group.likes} likes · {group.comments} comments
            {' · '}
            {group.posts.length} post(s)
          </button>
        ))}
      </div>

      <p className='mt-3 text-xs text-neutral-600'>
        Selecting a group opens its first post below. The group count includes
        every matching post, including overlapping observations.
      </p>
    </div>
  );
}

function LorenzCurve({ posts }: { posts: CompletePost[] }) {
  const values = posts.map((post) => post.total).sort((a, b) => a - b);

  const sum = values.reduce((a, b) => a + b, 0);

  if (!values.length || sum === 0) {
    return (
      <p className='text-sm text-neutral-600'>
        Not enough interactions to draw this curve.
      </p>
    );
  }

  let cumulative = 0;

  const points = [{ x: 0, y: 0 }];

  values.forEach((value, index) => {
    cumulative += value;
    points.push({
      x: (index + 1) / values.length,
      y: cumulative / sum,
    });
  });

  const left = 45;
  const top = 15;
  const size = 260;

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${
          left + point.x * size
        } ${top + size - point.y * size}`
    )
    .join(' ');

  return (
    <svg
      viewBox='0 0 360 330'
      className='mx-auto w-full max-w-[420px]'
      role='img'
      aria-label='Lorenz curve of recorded interaction totals among loaded posts.'
    >
      <line
        x1={left}
        y1={top + size}
        x2={left + size}
        y2={top}
        stroke='#A3A3A3'
        strokeDasharray='5 5'
        strokeWidth='2'
      />

      <path
        d={path}
        fill='none'
        stroke={PURPLE}
        strokeWidth='4'
        strokeLinecap='round'
      />

      <line x1={left} y1={top} x2={left} y2={top + size} stroke='#525252' />

      <line
        x1={left}
        y1={top + size}
        x2={left + size}
        y2={top + size}
        stroke='#525252'
      />

      <text
        x={left + size / 2}
        y={top + size + 35}
        textAnchor='middle'
        fontSize='12'
        fill='#525252'
      >
        Share of posts
      </text>

      <text x={left} y='10' fontSize='12' fill='#525252'>
        Share of interactions
      </text>
    </svg>
  );
}

export default function InsightsPage() {
  const [mode, setMode] = useState<Mode>('personal');
  const [sortBy, setSortBy] = useState<SortBy>('total');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['sociality-insights-v3', mode],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPosts(mode, pageParam),
    getNextPageParam: (last, pages) =>
      last.hasNextPage && pages.length < MAX_PAGES
        ? pages.length + 1
        : undefined,
  });

  const analysis = useMemo(() => {
    const raw = query.data?.pages.flatMap((page) => page.items) ?? [];
    const unique = new Map<number, Post>();

    for (const post of raw) {
      if (!unique.has(post.id)) {
        unique.set(post.id, post);
      }
    }

    const posts = [...unique.values()];

    const complete: CompletePost[] = posts.flatMap((post) => {
      if (post.likes === null || post.comments === null) {
        return [];
      }

      return [
        {
          ...post,
          likes: post.likes,
          comments: post.comments,
          total: post.likes + post.comments,
        },
      ];
    });

    const likes = complete.reduce((s, p) => s + p.likes, 0);
    const comments = complete.reduce((s, p) => s + p.comments, 0);
    const total = likes + comments;

    const ranked = [...complete].sort(
      (a, b) => b.total - a.total || a.id - b.id
    );

    const topCount = Math.ceil(complete.length * 0.1);
    const topTotal = ranked.slice(0, topCount).reduce((s, p) => s + p.total, 0);

    return {
      posts: complete,
      ranked,
      rawCount: raw.length,
      uniqueCount: posts.length,
      duplicates: raw.length - posts.length,
      missing: posts.length - complete.length,
      likes,
      comments,
      total,
      topCount,
      topShare: total > 0 ? topTotal / total : null,
      gini: gini(complete.map((p) => p.total)),
      hhi:
        total > 0
          ? complete.reduce((s, p) => s + (p.total / total) ** 2, 0)
          : null,
      median: median(complete.map((p) => p.total)),
    };
  }, [query.data]);

  const pagesLoaded = query.data?.pages.length ?? 0;

  const reachedLimit =
    pagesLoaded >= MAX_PAGES && Boolean(query.data?.pages.at(-1)?.hasNextPage);

  const partial = Boolean(query.hasNextPage || reachedLimit);
  const small = analysis.posts.length < 10;

  const selected = analysis.posts.find((post) => post.id === selectedId);

  const topPost = analysis.ranked[0];

  const scopeText = mode === 'personal' ? 'your posts' : 'community posts';

  const coverage = `Based on ${fmt(
    analysis.posts.length
  )} loaded ${scopeText} with complete counts`;

  return (
    <main className='mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6'>
      <Link
        href='/feed'
        className='inline-flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white'
      >
        <ArrowLeft size={16} />
        Back to Feed
      </Link>

      <header className='space-y-5'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-[#B99AFF]'>
              Sociality Intelligence
            </p>
            <h1 className='mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl'>
              Creator Insights
            </h1>
            <p className='mt-2 max-w-2xl text-sm leading-6 text-neutral-300'>
              Understand which posts receive interactions and what the available
              data can — and cannot — tell you.
            </p>
          </div>

          <button
            type='button'
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className='inline-flex items-center gap-2 rounded-xl bg-[#6936F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5728D8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60'
          >
            <RefreshCw
              size={16}
              className={query.isFetching ? 'animate-spin' : ''}
            />
            {query.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div
          className='inline-flex rounded-xl bg-white p-1'
          aria-label='Analytics scope'
        >
          {(
            [
              ['personal', 'My Posts'],
              ['community', 'Community'],
            ] as const
          ).map(([value, title]) => (
            <button
              key={value}
              type='button'
              onClick={() => {
                setMode(value);
                setSelectedId(null);
                setSortBy('total');
              }}
              aria-pressed={mode === value}
              className={`rounded-lg px-5 py-2 text-sm font-semibold ${
                mode === value
                  ? 'bg-[#6936F2] text-white'
                  : 'text-neutral-800 hover:bg-neutral-100'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      </header>

      {query.isPending && (
        <div className='flex items-center justify-center gap-3 rounded-2xl border border-white/10 p-12 text-white'>
          <LoaderCircle className='animate-spin' />
          Loading insights...
        </div>
      )}

      {query.isError && !query.data && (
        <div className='rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900'>
          <p className='font-semibold'>Insights could not be loaded.</p>
          <p className='mt-2 text-sm'>
            {query.error instanceof Error
              ? query.error.message
              : 'Please try again.'}
          </p>
          <button
            type='button'
            onClick={() => query.refetch()}
            className='mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white'
          >
            Try again
          </button>
        </div>
      )}

      {query.data && (
        <>
          <section
            aria-label='Data coverage'
            className='rounded-2xl border border-violet-200 bg-violet-50 p-5 text-neutral-950'
          >
            <div className='flex flex-wrap items-center gap-3'>
              <Database size={20} className='text-[#6936F2]' />
              <p className='font-semibold'>{coverage}</p>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  partial
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {partial ? 'Partial sample' : 'All available pages loaded'}
              </span>
            </div>

            <p className='mt-3 text-sm leading-6 text-neutral-700'>
              {partial
                ? 'More posts may be available. Rankings and statistics may change as more pages are loaded.'
                : 'The API reports no further available page for this query. This does not verify coverage of the entire platform.'}
            </p>

            {analysis.missing > 0 && (
              <p className='mt-2 text-sm font-medium text-amber-900'>
                {analysis.missing} post(s) excluded because interaction counts
                are missing.
              </p>
            )}

            {small && (
              <p className='mt-2 text-sm font-medium text-amber-900'>
                Small sample: fewer than 10 analyzable posts. Treat findings as
                early observations.
              </p>
            )}
          </section>

          <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <MetricCard
              title='Posts analyzed'
              value={fmt(analysis.posts.length)}
              detail='Unique posts with both counts available'
            />
            <MetricCard
              title='Likes received'
              value={fmt(analysis.likes)}
              detail='Recorded likes on analyzed posts'
            />
            <MetricCard
              title='Comments received'
              value={fmt(analysis.comments)}
              detail='Recorded comments on analyzed posts'
            />
            <MetricCard
              title='Recorded interactions'
              value={fmt(analysis.total)}
              detail='Likes + comments; not an engagement rate'
            />
          </section>

          <Panel
            title='What stands out?'
            description='Simple observations based only on the posts loaded so far.'
          >
            <div className='grid gap-4 lg:grid-cols-2'>
              <div className='rounded-xl bg-violet-50 p-5'>
                <div className='flex items-center gap-2 font-semibold'>
                  <Sparkles size={18} className='text-[#6936F2]' />
                  Most interactions
                </div>

                <p className='mt-3 text-sm leading-6 text-neutral-800'>
                  {topPost && topPost.total > 0
                    ? `"${label(topPost)}" received ${fmt(
                        topPost.total
                      )} recorded interactions in this sample.`
                    : 'No recorded interactions to rank yet.'}
                </p>

                {topPost && (
                  <Link
                    href={`/posts/${topPost.id}`}
                    className='mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#6936F2]'
                  >
                    See this post <ArrowUpRight size={16} />
                  </Link>
                )}
              </div>

              <div className='rounded-xl bg-neutral-50 p-5'>
                <p className='font-semibold'>Likes vs conversations</p>
                <p className='mt-3 text-sm leading-6 text-neutral-800'>
                  Of {fmt(analysis.total)} recorded interactions,{' '}
                  {fmt(analysis.likes)} were likes and {fmt(analysis.comments)}{' '}
                  were comments.
                </p>
                <p className='mt-2 text-xs leading-5 text-neutral-600'>
                  These are counts of actions, not unique people or the
                  percentage of viewers who interacted.
                </p>
              </div>
            </div>

            <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4'>
              <p className='text-sm font-semibold text-amber-950'>
                What can you do with this?
              </p>
              <p className='mt-2 text-sm leading-6 text-amber-900'>
                Review the top post and consider testing a similar format in a
                future post. This is an experiment idea, not evidence that the
                format caused more interactions.
              </p>
              <p className='mt-2 text-xs text-amber-900'>
                {small || partial
                  ? 'Confidence is limited because the sample is small or incomplete.'
                  : 'This remains descriptive: reach, audience size, and post age are not controlled.'}
              </p>
            </div>
          </Panel>

          <Panel
            title={
              mode === 'community'
                ? 'Discover posts in the community'
                : 'Which of your posts received the most interactions?'
            }
            description='Choose what to compare. Select a post to open its details.'
          >
            <div className='mb-5 flex flex-wrap gap-2'>
              {(
                [
                  ['total', 'Most interactions'],
                  ['likes', 'Most liked'],
                  ['comments', 'Most discussed'],
                ] as const
              ).map(([value, title]) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => setSortBy(value)}
                  aria-pressed={sortBy === value}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    sortBy === value
                      ? 'bg-[#6936F2] text-white'
                      : 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            <RankedBars
              posts={analysis.posts}
              sortBy={sortBy}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </Panel>

          <Panel
            title='Do likes and comments appear together?'
            description='A bubble groups posts with identical like and comment counts.'
          >
            <BubbleChart
              posts={analysis.posts}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </Panel>

          {selected && (
            <section className='rounded-2xl border border-violet-200 bg-violet-50 p-5 text-neutral-950'>
              <p className='text-xs font-bold uppercase tracking-wider text-[#6936F2]'>
                Selected post
              </p>
              <h2 className='mt-2 font-semibold'>{label(selected)}</h2>
              <p className='mt-2 text-sm text-neutral-700'>
                By {selected.author} · {selected.likes} likes ·{' '}
                {selected.comments} comments
              </p>
              <div className='mt-3 flex flex-wrap items-center gap-4'>
                <Link
                  href={`/posts/${selected.id}`}
                  className='inline-flex items-center gap-1 text-sm font-semibold text-[#6936F2]'
                >
                  View post <ArrowUpRight size={16} />
                </Link>
                <button
                  type='button'
                  onClick={() => setSelectedId(null)}
                  className='text-sm text-neutral-700 underline'
                >
                  Clear selection
                </button>
              </div>
            </section>
          )}

          <Panel
            title='Advanced Analytics'
            description='Optional statistical details for users who want to explore the data more deeply.'
          >
            <details className='rounded-xl border border-neutral-200 p-4'>
              <summary className='cursor-pointer font-semibold text-neutral-900'>
                Show distribution and concentration analysis
              </summary>

              <div className='mt-5 space-y-5'>
                {small && (
                  <p className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
                    These statistics describe only {analysis.posts.length}{' '}
                    posts. With such a small sample, do not use them to make
                    broad conclusions about content performance.
                  </p>
                )}

                {partial && (
                  <p className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
                    Partial sample: the distribution may change when additional
                    pages are loaded.
                  </p>
                )}

                <div className='grid gap-4 sm:grid-cols-2'>
                  <MetricCard
                    title='Median interactions per post'
                    value={
                      analysis.median === null ? 'N/A' : fmt(analysis.median)
                    }
                    detail='Half the analyzed posts are at or below this value'
                  />
                  <MetricCard
                    title='Top 10% share'
                    value={
                      analysis.topShare === null
                        ? 'N/A'
                        : `${(analysis.topShare * 100).toFixed(1)}%`
                    }
                    detail={`Share received by the top ${analysis.topCount} loaded posts; rounded up`}
                  />
                  <MetricCard
                    title='Gini coefficient'
                    value={
                      analysis.gini === null ? 'N/A' : analysis.gini.toFixed(3)
                    }
                    detail='Higher means recorded interactions are more unevenly distributed'
                  />
                  <MetricCard
                    title='HHI concentration'
                    value={
                      analysis.hhi === null ? 'N/A' : analysis.hhi.toFixed(4)
                    }
                    detail='Sum of squared shares of recorded interactions'
                  />
                </div>

                <div>
                  <h3 className='font-semibold'>
                    How evenly are interactions distributed?
                  </h3>
                  <p className='mt-1 text-sm text-neutral-600'>
                    The diagonal represents equal distribution. A curve farther
                    below it indicates more concentration among fewer posts.
                  </p>
                  <LorenzCurve posts={analysis.posts} />
                </div>

                <p className='text-xs leading-6 text-neutral-600'>
                  Gini and HHI describe concentration, not content quality or
                  causes of engagement. No reach, impressions, or follower
                  denominator is available.
                </p>
              </div>
            </details>
          </Panel>

          <Panel
            title='How reliable is this analysis?'
            description='See which records were included and how much data has been loaded.'
          >
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <MetricCard
                title='Records loaded'
                value={fmt(analysis.rawCount)}
                detail='Before duplicate removal'
              />
              <MetricCard
                title='Unique posts'
                value={fmt(analysis.uniqueCount)}
                detail='Distinct post IDs'
              />
              <MetricCard
                title='Duplicates'
                value={fmt(analysis.duplicates)}
                detail='Repeated IDs across loaded pages'
              />
              <MetricCard
                title='Missing counts'
                value={fmt(analysis.missing)}
                detail='Excluded from interaction calculations'
              />
            </div>

            <div className='mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 p-4'>
              <p className='flex items-center gap-2 text-sm text-neutral-700'>
                <Database size={17} />
                {pagesLoaded} page(s) loaded
              </p>

              {query.hasNextPage && (
                <button
                  type='button'
                  disabled={query.isFetchingNextPage}
                  onClick={() => query.fetchNextPage()}
                  className='inline-flex items-center gap-2 rounded-xl bg-[#6936F2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60'
                >
                  {query.isFetchingNextPage ? (
                    <LoaderCircle size={16} className='animate-spin' />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                  Load more posts
                </button>
              )}
            </div>

            {query.isFetchNextPageError && (
              <div className='mt-3 flex flex-wrap items-center gap-3'>
                <p className='text-sm text-red-700'>
                  The next page could not be loaded.
                </p>
                <button
                  type='button'
                  onClick={() => query.fetchNextPage()}
                  className='rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white'
                >
                  Retry page
                </button>
              </div>
            )}

            <div className='mt-5 space-y-2 text-xs leading-6 text-neutral-600'>
              <p className='flex items-center gap-2'>
                <ShieldCheck size={16} />
                Source: mentor-provided Sociality API.
              </p>
              <p>Scope: {scopeText}, limited to successfully fetched pages.</p>
              <p>
                {reachedLimit
                  ? `The ${MAX_PAGES}-page safety limit was reached. Additional posts may exist.`
                  : partial
                    ? 'More posts may be available to load.'
                    : 'The API listing reports no further page for this query.'}
              </p>
              <p>
                Missing interaction counts are excluded, never silently treated
                as zero.
              </p>
              <p>
                Likes and comments are recorded counts, not engagement rate,
                reach, impressions, or unique users.
              </p>
              <p>
                Rankings describe the currently loaded sample. They do not
                establish why people interacted.
              </p>
            </div>
          </Panel>

          <footer className='flex items-center gap-2 text-xs text-neutral-300'>
            <Heart size={14} />
            <MessageCircle size={14} />
            Sociality Intelligence · Built on the existing API
          </footer>
        </>
      )}
    </main>
  );
}
