'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Database,
  Heart,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { OpportunityRadar } from '@/components/insights/opportunity-radar';
import { CreatorIntelligenceSuite } from '@/components/insights/creator-intelligence-suite';
import { FairComparison } from '@/components/insights/fair-comparison';
import { getMyPostList } from '@/lib/api/account';
import { api } from '@/lib/api/client';

type Mode = 'personal' | 'community';
type Tab = 'discover' | 'improve' | 'advanced';
type SortBy = 'total' | 'likes' | 'comments';
type JsonObject = Record<string, unknown>;

type Post = {
  id: number;
  caption: string;
  author: string;
  likes: number | null;
  comments: number | null;
};

type CompletePost = Post & {
  likes: number;
  comments: number;
  total: number;
};

type Page = {
  items: Post[];
  hasNextPage: boolean;
};

const PAGE_SIZE = 12;
const MAX_PAGES = 20;
const REFRESH_INTERVAL = 60_000;

const CHALLENGES = [
  {
    id: 'hook',
    emoji: '⚡',
    title: 'The Hook Remix',
    text: 'Try a new opening sentence for your next post.',
    detail:
      'Write two different opening lines for a similar topic. Publish one and keep the other for a future experiment.',
  },
  {
    id: 'question',
    emoji: '💬',
    title: 'Start a Conversation',
    text: 'Invite your audience to share a genuine thought.',
    detail:
      'End your next post with an open question. Later, compare recorded comments with a similar post.',
  },
  {
    id: 'story',
    emoji: '🌷',
    title: 'Tell a Tiny Story',
    text: 'Share one meaningful moment from your day.',
    detail:
      'Describe a real experience, what you learned, and why it matters to you.',
  },
] as const;

function objectOf(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function countOf(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function parseCommunity(value: unknown, page: number): Page {
  const root = objectOf(value);

  if (root.success === false) {
    throw new Error(
      stringOf(root.message) || 'Unable to load community posts.'
    );
  }

  const data = root.data ?? value;
  const payload = objectOf(data);

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
    throw new Error('Unexpected community posts response format.');
  }

  const items: Post[] = raw.map((entry: unknown) => {
    const post = objectOf(entry);
    const author = objectOf(post.author ?? post.user);
    const id = Number(post.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('Invalid post ID returned by the API.');
    }

    return {
      id,
      caption: stringOf(post.caption) || stringOf(post.content),
      author:
        stringOf(author.username) ||
        stringOf(author.name) ||
        'Sociality Creator',
      likes: countOf(post.likeCount ?? post.likesCount ?? post.likes_count),
      comments: countOf(
        post.commentCount ?? post.commentsCount ?? post.comments_count
      ),
    };
  });

  const pagination = objectOf(payload.pagination ?? root.pagination);

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
        likes: countOf(post.likesCount),
        comments: countOf(post.commentsCount),
      })),
      hasNextPage: result.hasNextPage,
    };
  }

  const response = await api.get<unknown>('/posts', {
    params: {
      page,
      limit: PAGE_SIZE,
    },
  });

  return parseCommunity(response.data, page);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMaybe(value: number | null): string {
  return value === null ? 'Not available' : formatNumber(value);
}

function postLabel(post: Post): string {
  const caption = post.caption.trim();

  return caption
    ? caption.slice(0, 95) + (caption.length > 95 ? '…' : '')
    : `Post #${post.id}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function gini(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);

  if (sum === 0) return null;

  const weighted = sorted.reduce(
    (total, value, index) => total + value * (index + 1),
    0
  );

  return (
    (2 * weighted) / (sorted.length * sum) - (sorted.length + 1) / sorted.length
  );
}

function Panel({
  title,
  description,
  children,
  action,
  id,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 text-[#25213B] shadow-sm sm:p-7'
    >
      <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-xl font-bold tracking-tight sm:text-2xl'>
            {title}
          </h2>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6B657C]'>
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({
  emoji,
  label,
  value,
  description,
  background,
}: {
  emoji: string;
  label: string;
  value: string;
  description: string;
  background: string;
}) {
  return (
    <div className={`rounded-[22px] border border-white/80 p-5 ${background}`}>
      <span className='text-2xl' aria-hidden='true'>
        {emoji}
      </span>
      <p className='mt-3 text-sm font-semibold text-[#5D5572]'>{label}</p>
      <p className='mt-1 text-3xl font-black tracking-tight text-[#211A39]'>
        {value}
      </p>
      <p className='mt-2 text-xs leading-5 text-[#6B657C]'>{description}</p>
    </div>
  );
}

function PostCard({
  post,
  selected,
  onSelect,
}: {
  post: CompletePost;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <button
      type='button'
      onClick={() => onSelect(post.id)}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#6936F2] ${
        selected
          ? 'border-[#6936F2] bg-[#F3EEFF]'
          : 'border-[#EBE7F3] bg-white hover:bg-[#FAF8FF]'
      }`}
    >
      <p className='line-clamp-2 break-words text-sm font-semibold leading-6'>
        {postLabel(post)}
      </p>
      <p className='mt-1 text-xs text-[#736C82]'>By {post.author}</p>
      <div className='mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[#51466E]'>
        <span>💜 {post.likes} likes</span>
        <span>💬 {post.comments} comments</span>
        <span>✨ {post.total} interactions</span>
      </div>
    </button>
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
      {
        likes: number;
        comments: number;
        posts: CompletePost[];
      }
    >();

    for (const post of posts) {
      const key = `${post.likes}:${post.comments}`;
      const existing = map.get(key);

      if (existing) {
        existing.posts.push(post);
      } else {
        map.set(key, {
          likes: post.likes,
          comments: post.comments,
          posts: [post],
        });
      }
    }

    return [...map.values()].sort((a, b) => b.posts.length - a.posts.length);
  }, [posts]);

  if (posts.length === 0) {
    return <p className='text-sm text-[#6B657C]'>No posts to visualize yet.</p>;
  }

  const left = 54;
  const top = 35;
  const plotWidth = 560;
  const plotHeight = 245;

  const maxLikes = Math.max(1, ...posts.map((post) => post.likes));
  const maxComments = Math.max(1, ...posts.map((post) => post.comments));
  const maxGroup = Math.max(1, ...groups.map((group) => group.posts.length));

  const x = (value: number) => left + (value / maxLikes) * plotWidth;

  const y = (value: number) =>
    top + plotHeight - (value / maxComments) * plotHeight;

  return (
    <div>
      <div className='overflow-x-auto rounded-2xl bg-[#FBFAFF] p-3'>
        <svg
          viewBox='0 0 680 340'
          className='w-full min-w-[350px]'
          role='img'
          aria-label='Bubble chart showing recorded likes and comments. Larger bubbles represent more posts with identical counts.'
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1={left}
                x2={left + plotWidth}
                y1={y(maxComments * fraction)}
                y2={y(maxComments * fraction)}
                stroke='#E5E0EF'
              />
              <text
                x={left - 10}
                y={y(maxComments * fraction) + 4}
                textAnchor='end'
                fontSize='11'
                fill='#655B78'
              >
                {formatNumber(maxComments * fraction)}
              </text>
              <text
                x={x(maxLikes * fraction)}
                y={top + plotHeight + 20}
                textAnchor='middle'
                fontSize='11'
                fill='#655B78'
              >
                {formatNumber(maxLikes * fraction)}
              </text>
            </g>
          ))}

          <text x={left} y='18' fontSize='13' fill='#51466E'>
            Comments
          </text>

          <text
            x={left + plotWidth / 2}
            y='330'
            fontSize='13'
            fill='#51466E'
            textAnchor='middle'
          >
            Likes
          </text>

          {groups.map((group) => {
            const selected = group.posts.some((post) => post.id === selectedId);

            const radius = 9 + 17 * Math.sqrt(group.posts.length / maxGroup);

            return (
              <g key={`${group.likes}:${group.comments}`}>
                <circle
                  cx={x(group.likes)}
                  cy={y(group.comments)}
                  r={radius}
                  fill={selected ? '#0891B2' : '#6936F2'}
                  fillOpacity='0.85'
                  stroke='#FFFFFF'
                  strokeWidth='2'
                >
                  <title>
                    {`${group.posts.length} posts with ${group.likes} likes and ${group.comments} comments`}
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

      <p className='mt-3 text-sm leading-6 text-[#655B78]'>
        Each bubble groups posts with the same counts. Choose a group below to
        explore its posts.
      </p>

      <div className='mt-4 flex flex-wrap gap-2'>
        {groups.map((group) => (
          <button
            key={`${group.likes}:${group.comments}`}
            type='button'
            onClick={() => onSelect(group.posts[0].id)}
            className='rounded-full border border-[#DDD5F4] bg-white px-3 py-2 text-xs font-semibold text-[#51466E] hover:bg-[#F3EEFF]'
          >
            {group.likes} likes, {group.comments} comments
            <span className='ml-2 text-[#6936F2]'>
              {group.posts.length} posts
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LorenzCurve({ posts }: { posts: CompletePost[] }) {
  const values = posts.map((post) => post.total).sort((a, b) => a - b);

  const sum = values.reduce((total, value) => total + value, 0);

  if (values.length === 0 || sum === 0) {
    return (
      <p className='text-sm text-[#6B657C]'>
        Not enough recorded interactions to draw this curve.
      </p>
    );
  }

  const points = [{ x: 0, y: 0 }];
  let cumulative = 0;

  values.forEach((value, index) => {
    cumulative += value;

    points.push({
      x: (index + 1) / values.length,
      y: cumulative / sum,
    });
  });

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${
          45 + point.x * 260
        } ${280 - point.y * 260}`
    )
    .join(' ');

  return (
    <svg
      viewBox='0 0 360 330'
      className='mx-auto w-full max-w-[430px]'
      role='img'
      aria-label='Lorenz curve showing concentration of recorded interactions among loaded posts.'
    >
      <line
        x1='45'
        y1='280'
        x2='305'
        y2='20'
        stroke='#B7AEC8'
        strokeDasharray='5 5'
        strokeWidth='2'
      />

      <path
        d={path}
        fill='none'
        stroke='#6936F2'
        strokeWidth='4'
        strokeLinecap='round'
      />

      <line x1='45' y1='20' x2='45' y2='280' stroke='#655B78' />

      <line x1='45' y1='280' x2='305' y2='280' stroke='#655B78' />

      <text x='175' y='315' textAnchor='middle' fontSize='12' fill='#655B78'>
        Share of posts
      </text>

      <text x='45' y='13' fontSize='12' fill='#655B78'>
        Share of interactions
      </text>
    </svg>
  );
}

export default function InsightsPage() {
  const [mode, setMode] = useState<Mode>('personal');

  const [tab, setTab] = useState<Tab>('discover');

  const [sortBy, setSortBy] = useState<SortBy>('total');

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [showWhy, setShowWhy] = useState(false);

  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [autoRefresh, setAutoRefresh] = useState(true);

  const query = useInfiniteQuery({
    queryKey: ['sociality-creator-playground-v1', mode],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPosts(mode, pageParam),
    getNextPageParam: (last, pages) =>
      last.hasNextPage && pages.length < MAX_PAGES
        ? pages.length + 1
        : undefined,
    staleTime: 30_000,
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const analysis = useMemo(() => {
    const raw = query.data?.pages.flatMap((page) => page.items) ?? [];

    const unique = new Map<number, Post>();

    for (const post of raw) {
      if (!unique.has(post.id)) {
        unique.set(post.id, post);
      }
    }

    const allPosts = [...unique.values()];

    const posts: CompletePost[] = allPosts.flatMap((post) => {
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

    const likes = posts.reduce((sum, post) => sum + post.likes, 0);

    const comments = posts.reduce((sum, post) => sum + post.comments, 0);

    const total = likes + comments;

    const ranked = [...posts].sort((a, b) => b.total - a.total || a.id - b.id);

    const topCount = Math.ceil(posts.length * 0.1);

    const topTotal = ranked
      .slice(0, topCount)
      .reduce((sum, post) => sum + post.total, 0);

    return {
      posts,
      ranked,
      likes,
      comments,
      total,
      rawCount: raw.length,
      uniqueCount: allPosts.length,
      duplicates: raw.length - allPosts.length,
      missing: allPosts.length - posts.length,
      median: median(posts.map((post) => post.total)),
      gini: gini(posts.map((post) => post.total)),
      hhi:
        total > 0
          ? posts.reduce((sum, post) => sum + (post.total / total) ** 2, 0)
          : null,
      topCount,
      topShare: total > 0 ? topTotal / total : null,
    };
  }, [query.data]);

  const pagesLoaded = query.data?.pages.length ?? 0;

  const reachedLimit =
    pagesLoaded >= MAX_PAGES &&
    Boolean(query.data?.pages[pagesLoaded - 1]?.hasNextPage);

  const partial = Boolean(query.hasNextPage || reachedLimit);

  const smallSample = analysis.posts.length < 10;

  const selected = analysis.posts.find((post) => post.id === selectedId);

  const filtered = analysis.posts
    .filter((post) =>
      `${post.caption} ${post.author}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    )
    .sort((a, b) => b[sortBy] - a[sortBy] || a.id - b.id);

  const evidenceStatus =
    smallSample || partial || analysis.missing > 0
      ? 'Early observation'
      : 'Descriptive signal';

  const scope = mode === 'personal' ? 'your posts' : 'community posts';

  const lastUpdated = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const changeTab = (next: Tab) => {
    setTab(next);
  };

  const selectRadarPost = (id: number) => {
    setSelectedId(id);
  };

  const missingPercent =
    analysis.uniqueCount > 0
      ? (analysis.missing / analysis.uniqueCount) * 100
      : null;

  return (
    <main className='min-h-screen bg-[#F8F6FF] px-4 py-6 text-[#25213B] sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        {/* Live data controls */}

        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Link
            href='/feed'
            className='inline-flex items-center gap-2 text-sm font-semibold text-[#655B78] hover:text-[#6936F2]'
          >
            <ArrowLeft size={17} />
            Back to Feed
          </Link>

          <div className='flex flex-wrap items-center gap-3'>
            <div
              role='status'
              aria-live='polite'
              className='flex flex-wrap items-center gap-3 rounded-xl border border-[#E4DCF8] bg-white px-4 py-2.5'
            >
              <span
                aria-hidden='true'
                className={`h-2.5 w-2.5 rounded-full ${
                  query.isFetching
                    ? 'bg-amber-400 motion-safe:animate-pulse'
                    : query.isError
                      ? 'bg-red-500'
                      : query.data
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                }`}
              />

              <div>
                <p className='text-xs font-bold'>
                  {query.isFetching
                    ? 'Checking for updates'
                    : query.isError
                      ? 'Update needs attention'
                      : query.data
                        ? 'Data ready'
                        : 'Waiting for data'}
                </p>

                <p className='text-xs text-[#736C82]'>
                  {lastUpdated
                    ? `Last updated at ${lastUpdated}`
                    : 'Waiting for the first update'}
                </p>
              </div>

              <label className='flex cursor-pointer items-center gap-2 border-l border-[#E4DCF8] pl-3'>
                <input
                  type='checkbox'
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                  className='h-4 w-4 accent-[#6936F2]'
                />
                <span className='text-xs font-semibold text-[#51466E]'>
                  Auto refresh
                </span>
              </label>
            </div>

            <button
              type='button'
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              className='inline-flex items-center gap-2 rounded-xl bg-[#6936F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5526D7] disabled:opacity-60'
            >
              <RefreshCw
                size={16}
                className={query.isFetching ? 'motion-safe:animate-spin' : ''}
              />
              {query.isFetching ? 'Refreshing...' : 'Refresh insights'}
            </button>
          </div>
        </div>

        {/* Welcome */}

        <header className='relative overflow-hidden rounded-[30px] bg-[#6936F2] p-6 text-white sm:p-9'>
          <div className='pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10' />
          <div className='pointer-events-none absolute bottom-[-90px] right-24 h-48 w-48 rounded-full bg-[#B99AFF]/30' />

          <div className='relative max-w-3xl'>
            <p className='text-xs font-bold uppercase tracking-[0.19em] text-[#E4D8FF]'>
              Sociality Creator Playground
            </p>

            <h1 className='mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl'>
              Hey, content creator! 👋
            </h1>

            <p className='mt-3 text-xl font-semibold sm:text-2xl'>
              This page is designed just for you.
            </p>

            <p className='mt-4 max-w-2xl text-sm leading-7 text-[#F0E9FF] sm:text-base'>
              Find inspiration from real Sociality posts, understand what people
              respond to, compare your content thoughtfully, and discover
              something creative to try next.
            </p>

            <p className='mt-3 text-sm font-semibold'>
              No complicated statistics needed. Just helpful insights and a
              little creative magic. ✨
            </p>

            <div className='mt-6 flex flex-wrap gap-2'>
              {[
                '💡 Find ideas',
                '💜 Understand your posts',
                '🎯 Try something new',
                '🔎 Explore the data',
              ].map((item) => (
                <span
                  key={item}
                  className='rounded-full bg-white/20 px-3 py-2 text-xs font-semibold'
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Navigation */}

        <nav
          aria-label='Creator Playground sections'
          className='grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm'
        >
          {(
            [
              ['discover', 'Discover', Compass],
              ['improve', 'Improve', Target],
              ['advanced', 'Data Lab', Database],
            ] as const
          ).map(([value, title, Icon]) => (
            <button
              key={value}
              type='button'
              onClick={() => changeTab(value)}
              aria-pressed={tab === value}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-bold transition-colors sm:text-sm ${
                tab === value
                  ? 'bg-[#6936F2] text-white shadow-sm'
                  : 'text-[#655B78] hover:bg-[#F3EEFF]'
              }`}
            >
              <Icon size={17} />
              {title}
            </button>
          ))}
        </nav>

        {/* Data source */}

        <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E9E5F4] bg-white p-4'>
          <div>
            <p className='text-sm font-bold'>Whose posts are we exploring?</p>
            <p className='mt-1 text-xs text-[#736C82]'>
              Switch between your own creations and the Sociality community.
            </p>
          </div>

          <div className='inline-flex rounded-xl bg-[#F3EEFF] p-1'>
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

                  setSearch('');
                }}
                aria-pressed={mode === value}
                className={`rounded-lg px-4 py-2 text-xs font-bold sm:text-sm ${
                  mode === value
                    ? 'bg-[#6936F2] text-white'
                    : 'text-[#51466E] hover:bg-white'
                }`}
              >
                {title}
              </button>
            ))}
          </div>
        </div>

        {query.isPending && (
          <div className='flex items-center justify-center gap-3 rounded-2xl bg-white p-12 text-[#51466E]'>
            <LoaderCircle className='motion-safe:animate-spin' />
            Gathering your creator insights...
          </div>
        )}

        {query.isError && (
          <div
            role='alert'
            className='rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900'
          >
            <p className='font-bold'>We could not refresh your insights.</p>
            <p className='mt-2 text-sm'>
              {query.error instanceof Error
                ? query.error.message
                : 'Please try again.'}
            </p>

            {query.data && (
              <p className='mt-2 text-sm'>
                You can still explore the last successfully loaded results.
              </p>
            )}

            <button
              type='button'
              onClick={() => void query.refetch()}
              className='mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white'
            >
              Try again
            </button>
          </div>
        )}

        {query.data && (
          <>
            {/* Data coverage */}

            <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E4DCF8] bg-[#F0EAFF] p-4'>
              <div className='flex items-start gap-3'>
                <ShieldCheck
                  size={21}
                  className='mt-0.5 shrink-0 text-[#6936F2]'
                />

                <div>
                  <p className='text-sm font-bold text-[#38245F]'>
                    Your insights use {formatNumber(analysis.posts.length)}{' '}
                    loaded {scope} with complete interaction counts.
                  </p>

                  <p className='mt-1 text-xs leading-5 text-[#655B78]'>
                    {partial
                      ? 'More posts may be available. Your findings may change as you load more.'
                      : 'The API reports no further page for this query. This does not prove coverage of the entire platform.'}{' '}
                    {smallSample
                      ? 'This is a small sample, so treat patterns as early observations.'
                      : ''}
                  </p>
                </div>
              </div>

              <button
                type='button'
                onClick={() => changeTab('advanced')}
                className='text-xs font-bold text-[#6936F2] underline underline-offset-4'
              >
                Check data quality
              </button>
            </div>

            {/* Summary metrics */}

            <section
              aria-label='Your creator numbers'
              className='grid grid-cols-2 gap-3 lg:grid-cols-4'
            >
              <Metric
                emoji='📝'
                label='Posts explored'
                value={formatNumber(analysis.posts.length)}
                description='Unique posts with complete counts'
                background='bg-[#EEE8FF]'
              />

              <Metric
                emoji='💜'
                label='Likes recorded'
                value={formatNumber(analysis.likes)}
                description='Likes across analyzed posts'
                background='bg-[#FFEAF3]'
              />

              <Metric
                emoji='💬'
                label='Comments recorded'
                value={formatNumber(analysis.comments)}
                description='Comments across analyzed posts'
                background='bg-[#E5F7F6]'
              />

              <Metric
                emoji='✨'
                label='Total interactions'
                value={formatNumber(analysis.total)}
                description='Likes plus comments, not engagement rate'
                background='bg-[#FFF2DF]'
              />
            </section>

            {/* Discover */}

            {tab === 'discover' && (
              <div className='space-y-6'>
                <OpportunityRadar
                  posts={analysis.posts}
                  partialCoverage={partial}
                  onSelectPost={selectRadarPost}
                />

                <Panel
                  id='creator-post-explorer'
                  title='Explore what catches attention ✨'
                  description='Discover posts with the most recorded likes or comments in the data you have loaded.'
                >
                  <div className='mb-5 flex flex-wrap gap-2'>
                    {(
                      [
                        ['total', '✨ All interactions'],
                        ['likes', '💜 Most liked'],
                        ['comments', '💬 Most discussed'],
                      ] as const
                    ).map(([value, title]) => (
                      <button
                        key={value}
                        type='button'
                        onClick={() => setSortBy(value)}
                        aria-pressed={sortBy === value}
                        className={`rounded-full px-4 py-2 text-xs font-bold ${
                          sortBy === value
                            ? 'bg-[#6936F2] text-white'
                            : 'bg-[#F3EEFF] text-[#51466E]'
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>

                  <label className='mb-4 flex items-center gap-3 rounded-xl border border-[#E4DCF8] bg-white px-4 py-3'>
                    <Search size={18} className='text-[#736C82]' />

                    <input
                      type='search'
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder='Search captions or creators'
                      aria-label='Search loaded posts'
                      className='min-w-0 flex-1 bg-transparent text-sm text-[#25213B] outline-none placeholder:text-[#90889D]'
                    />
                  </label>

                  {selected && (
                    <div
                      role='status'
                      className='mb-4 rounded-xl border border-[#CDBBF8] bg-[#F3EEFF] p-4'
                    >
                      <p className='text-xs font-bold text-[#6936F2]'>
                        Selected post
                      </p>
                      <p className='mt-1 break-words text-sm font-semibold'>
                        {postLabel(selected)}
                      </p>
                      <p className='mt-2 text-xs text-[#51466E]'>
                        {selected.likes} likes, {selected.comments} comments
                      </p>
                    </div>
                  )}

                  <div className='grid gap-3 md:grid-cols-2'>
                    {filtered.slice(0, 8).map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        selected={selectedId === post.id}
                        onSelect={setSelectedId}
                      />
                    ))}
                  </div>

                  {filtered.length === 0 && (
                    <p className='rounded-xl bg-[#F8F6FF] p-5 text-sm text-[#655B78]'>
                      No matching posts in the loaded data.
                    </p>
                  )}

                  <p className='mt-4 text-xs leading-5 text-[#736C82]'>
                    These rankings use recorded interactions. They do not
                    measure reach, impressions, or content quality.
                  </p>
                </Panel>

                <Panel
                  title='The interaction universe 🪐'
                  description='Explore how likes and comments appear together. Bigger bubbles mean more posts share the same numbers.'
                >
                  <BubbleChart
                    posts={analysis.posts}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </Panel>
              </div>
            )}

            {/* Improve */}

            {tab === 'improve' && (
              <div className='space-y-6'>
                <FairComparison
                    posts={analysis.posts}
                    partialCoverage={partial}
                  />

                <Panel
                  title='Your Next Move 💡'
                  description='Turn observations into creative experiments. These are ideas to try, not guaranteed growth tricks.'
                  action={
                    <span className='rounded-full bg-[#FFF2DF] px-3 py-2 text-xs font-bold text-[#8C570C]'>
                      {evidenceStatus}
                    </span>
                  }
                >
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-[22px] bg-[#EEE8FF] p-5'>
                      <span className='text-3xl' aria-hidden='true'>
                        🧪
                      </span>

                      <h3 className='mt-3 text-lg font-black'>
                        Try a conversation starter
                      </h3>

                      <p className='mt-2 text-sm leading-7 text-[#51466E]'>
                        Create a post that ends with a genuine question. Later,
                        compare its recorded comments with another post created
                        for a similar audience.
                      </p>

                      <p className='mt-3 text-xs leading-6 text-[#655B78]'>
                        This is a testable idea. The current data cannot prove
                        that questions cause more comments.
                      </p>
                    </div>

                    <div className='rounded-[22px] bg-[#E5F7F6] p-5'>
                      <span className='text-3xl' aria-hidden='true'>
                        🎨
                      </span>

                      <h3 className='mt-3 text-lg font-black'>
                        Give your next post a fresh opening
                      </h3>

                      <p className='mt-2 text-sm leading-7 text-[#51466E]'>
                        Experiment with a personal story, a surprising fact, or
                        a helpful tip. Keep a note of what you changed and what
                        you observed.
                      </p>

                      <p className='mt-3 text-xs leading-6 text-[#655B78]'>
                        We cannot isolate the effect of an opening line from
                        these observational records.
                      </p>
                    </div>
                  </div>

                  <button
                    type='button'
                    onClick={() => setShowWhy((value) => !value)}
                    aria-expanded={showWhy}
                    className='mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#6936F2]'
                  >
                    <Lightbulb size={17} />
                    Why am I seeing these ideas?
                  </button>

                  {showWhy && (
                    <div className='mt-4 rounded-2xl bg-[#F8F6FF] p-5 text-sm leading-7 text-[#51466E]'>
                      <p>
                        These are creative experiments suggested by simple
                        rules. They are not automatically proven
                        recommendations.
                      </p>

                      <p className='mt-3'>
                        The current analysis includes {analysis.posts.length}{' '}
                        posts with complete interaction counts from the selected
                        source.
                      </p>

                      <p className='mt-3'>
                        We do not have reliable reach, impressions, audience
                        size, or exposure adjustments. Try one change at a time
                        and document what happens.
                      </p>
                    </div>
                  )}
                </Panel>

                <Panel
                  title='Creator Challenges 🎯'
                  description='Choose a small creative experiment. Progress stays in this browser session and is not saved to your account.'
                >
                  <div className='grid gap-4 md:grid-cols-3'>
                    {CHALLENGES.map((challenge) => {
                      const active = activeChallenge === challenge.id;

                      return (
                        <div
                          key={challenge.id}
                          className={`rounded-[22px] border p-5 ${
                            active
                              ? 'border-[#6936F2] bg-[#F3EEFF]'
                              : 'border-[#E9E5F4] bg-[#FBFAFF]'
                          }`}
                        >
                          <span className='text-3xl' aria-hidden='true'>
                            {challenge.emoji}
                          </span>

                          <h3 className='mt-3 font-black'>{challenge.title}</h3>

                          <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                            {challenge.text}
                          </p>

                          {active && (
                            <p className='mt-3 rounded-xl bg-white p-3 text-xs leading-6 text-[#51466E]'>
                              {challenge.detail}
                            </p>
                          )}

                          <button
                            type='button'
                            onClick={() =>
                              setActiveChallenge(active ? null : challenge.id)
                            }
                            className={`mt-4 rounded-xl px-4 py-2 text-xs font-bold ${
                              active
                                ? 'bg-white text-[#6936F2]'
                                : 'bg-[#6936F2] text-white'
                            }`}
                          >
                            {active
                              ? 'Challenge selected'
                              : 'Try this challenge'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p className='mt-4 text-xs leading-6 text-[#736C82]'>
                    These challenges encourage learning, not chasing likes. A
                    selected challenge is not evidence of improved performance.
                  </p>
                </Panel>
              </div>
            )}

            {/* Data Lab */}

            {tab === 'advanced' && (
              <div className='space-y-6'>

                  <CreatorIntelligenceSuite
                    posts={analysis.posts}
                    audit={{
                      rawCount: analysis.rawCount,
                      uniqueCount: analysis.uniqueCount,
                      duplicates: analysis.duplicates,
                      missing: analysis.missing,
                      pagesLoaded,
                      partialCoverage: partial,
                    }}
                  />

                <Panel
                  title='Data Quality Center 🛡️'
                  description='Know what your insights are based on. We show what was loaded, what could be analyzed, and what still needs checking.'
                  action={
                    <span className='rounded-full bg-[#EEE8FF] px-3 py-2 text-xs font-bold text-[#51466E]'>
                      {partial ? 'Partial coverage' : 'Current pages loaded'}
                    </span>
                  }
                >
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    <Metric
                      emoji='📦'
                      label='Records received'
                      value={formatNumber(analysis.rawCount)}
                      description='Rows returned by loaded API pages'
                      background='bg-[#EEE8FF]'
                    />

                    <Metric
                      emoji='📝'
                      label='Unique posts'
                      value={formatNumber(analysis.uniqueCount)}
                      description='Distinct post IDs'
                      background='bg-[#E5F7F6]'
                    />

                    <Metric
                      emoji='🔁'
                      label='Duplicate records'
                      value={formatNumber(analysis.duplicates)}
                      description='Repeated IDs excluded from analysis'
                      background='bg-[#FFF2DF]'
                    />

                    <Metric
                      emoji='🔎'
                      label='Incomplete counts'
                      value={formatNumber(analysis.missing)}
                      description='Posts missing valid likes or comments'
                      background='bg-[#FFEAF3]'
                    />
                  </div>

                  <div className='mt-5 rounded-2xl bg-[#F8F6FF] p-5'>
                    <h3 className='font-black'>How healthy is this dataset?</h3>

                    <p className='mt-2 text-sm leading-7 text-[#51466E]'>
                      {analysis.missing === 0
                        ? 'All unique posts currently loaded have usable interaction counts.'
                        : `${analysis.missing} unique posts need attention because likes or comments are missing or invalid.`}
                    </p>

                    <p className='mt-3 text-sm leading-7 text-[#51466E]'>
                      {missingPercent === null
                        ? 'No unique posts are currently available for a completeness calculation.'
                        : `${formatNumber(
                            missingPercent
                          )}% of unique loaded posts have incomplete interaction counts.`}
                    </p>

                    <p className='mt-3 text-sm leading-7 text-[#51466E]'>
                      {partial
                        ? 'The analysis does not yet include every available page. Loading more posts may change the findings.'
                        : 'The API currently reports no further page. This does not guarantee that every post on the platform was captured.'}
                    </p>
                  </div>

                  <div className='mt-5 grid gap-3 md:grid-cols-2'>
                    {[
                      {
                        title: 'Missing values are not zero',
                        text: 'If an interaction count is missing or invalid, the post is excluded from complete count analysis.',
                      },
                      {
                        title: 'Repeated IDs are counted once',
                        text: 'Duplicate post IDs are removed before calculating metrics.',
                      },
                      {
                        title: 'Pagination affects coverage',
                        text: 'Results describe the loaded API pages and can change when more posts become available.',
                      },
                      {
                        title: 'No unsupported metrics',
                        text: 'We do not estimate reach, impressions, retention, or viral probability from likes and comments alone.',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className='rounded-2xl border border-[#EBE7F3] p-4'
                      >
                        <p className='flex items-center gap-2 text-sm font-bold'>
                          <CheckCircle2 size={17} className='text-[#6936F2]' />
                          {item.title}
                        </p>
                        <p className='mt-2 text-xs leading-6 text-[#655B78]'>
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel
                  title='Understand your interaction patterns 📊'
                  description='These descriptive statistics show how recorded interactions are distributed across the posts currently analyzed.'
                >
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    <Metric
                      emoji='📍'
                      label='Median interactions'
                      value={formatMaybe(analysis.median)}
                      description='The middle value across analyzed posts'
                      background='bg-[#EEE8FF]'
                    />

                    <Metric
                      emoji='📈'
                      label='Top 10% share'
                      value={
                        analysis.topShare === null
                          ? 'Not available'
                          : `${formatNumber(analysis.topShare * 100)}%`
                      }
                      description={`${analysis.topCount} highest interaction posts`}
                      background='bg-[#FFEAF3]'
                    />

                    <Metric
                      emoji='⚖️'
                      label='Gini coefficient'
                      value={formatMaybe(analysis.gini)}
                      description='Descriptive interaction concentration'
                      background='bg-[#E5F7F6]'
                    />

                    <Metric
                      emoji='🧩'
                      label='HHI'
                      value={formatMaybe(analysis.hhi)}
                      description='Sum of squared interaction shares'
                      background='bg-[#FFF2DF]'
                    />
                  </div>

                  <p className='mt-5 text-sm leading-7 text-[#655B78]'>
                    A higher concentration means recorded interactions are
                    distributed less evenly among the analyzed posts. This does
                    not measure creator quality or explain why the pattern
                    occurred.
                  </p>
                </Panel>

                <Panel
                  title='The Lorenz Curve 📉'
                  description='See how recorded interactions accumulate from posts with the fewest interactions to posts with the most.'
                >
                  <LorenzCurve posts={analysis.posts} />

                  <p className='mt-4 text-xs leading-6 text-[#736C82]'>
                    The diagonal represents equal shares. The purple curve
                    describes only the currently analyzed posts.
                  </p>
                </Panel>

                <Panel
                  title='Methods and limitations 🔬'
                  description='A transparent explanation for anyone who wants to understand how the numbers are produced.'
                >
                  <div className='space-y-4 text-sm leading-7 text-[#51466E]'>
                    <p>
                      <strong>Data source:</strong> Sociality API responses for{' '}
                      {scope}. Pages are loaded in batches of {PAGE_SIZE}, with
                      a maximum of {MAX_PAGES} pages in the current session.
                    </p>

                    <p>
                      <strong>Interactions:</strong> Recorded likes plus
                      recorded comments. This is not an engagement rate.
                    </p>

                    <p>
                      <strong>Median:</strong> The middle observed value after
                      sorting interaction counts. For an even number of posts,
                      we use the average of the two middle values.
                    </p>

                    <p>
                      <strong>Gini:</strong> Calculated from nonnegative
                      recorded interaction totals. It is unavailable when total
                      recorded interactions equal zero.
                    </p>

                    <p>
                      <strong>HHI:</strong> The sum of squared shares of each
                      post in total recorded interactions. It is unavailable
                      when total interactions equal zero.
                    </p>

                    <p>
                      <strong>Top 10% share:</strong> The share of interactions
                      contributed by the highest interaction posts. The number
                      of posts is rounded up.
                    </p>

                    <p>
                      <strong>Opportunity Radar:</strong> A transparent keyword
                      based classification. Posts can match multiple themes.
                      Classification errors are possible.
                    </p>

                    <p>
                      <strong>Fair comparison:</strong> Raw recorded
                      interactions can be compared, but exposure adjusted
                      performance cannot be established without additional
                      variables.
                    </p>

                    <p>
                      <strong>Recommendations:</strong> Creative ideas for
                      testing, not causal estimates or guarantees of growth.
                    </p>
                  </div>
                </Panel>
              </div>
            )}

            {/* Pagination */}

            <section className='flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-[#E9E5F4] bg-white p-5 sm:p-7'>
              <div>
                <h2 className='text-lg font-bold'>Keep exploring 🌍</h2>

                <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                  {formatNumber(analysis.uniqueCount)} unique posts loaded
                  across {pagesLoaded} pages.
                  {partial
                    ? ' More posts may be available.'
                    : ' No additional page is currently reported.'}
                </p>

                {reachedLimit && (
                  <p className='mt-2 text-xs font-semibold text-amber-800'>
                    The current analysis has reached its pagination safety
                    limit.
                  </p>
                )}
              </div>

              {query.hasNextPage && !reachedLimit && (
                <button
                  type='button'
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetching}
                  className='inline-flex items-center gap-2 rounded-xl bg-[#6936F2] px-5 py-3 text-sm font-bold text-white hover:bg-[#5526D7] disabled:opacity-60'
                >
                  {query.isFetchingNextPage
                    ? 'Loading more...'
                    : 'Load more posts'}

                  <ArrowRight size={16} />
                </button>
              )}
            </section>

            {/* Footer */}

            <footer className='flex flex-wrap items-center justify-center gap-2 pb-5 text-center text-xs leading-6 text-[#736C82]'>
              <Heart size={14} />
              <MessageCircle size={14} />
              <BarChart3 size={14} />
              <TrendingUp size={14} />
              Sociality Creator Playground. Make content smarter, without making
              analytics harder.
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
