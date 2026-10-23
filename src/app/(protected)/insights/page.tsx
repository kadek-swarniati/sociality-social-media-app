'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
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

type Page = {
  items: Post[];
  hasNextPage: boolean;
};

type CompletePost = Post & {
  likes: number;
  comments: number;
  total: number;
};

type Topic = {
  id: string;
  title: string;
  emoji: string;
  words: string[];
  color: string;
};

const PAGE_SIZE = 12;
const MAX_PAGES = 20;
const REFRESH_INTERVAL = 60_000;

const TOPICS: Topic[] = [
  {
    id: 'learning',
    title: 'Learning and tips',
    emoji: '💡',
    words: [
      'learn',
      'learning',
      'tips',
      'tutorial',
      'study',
      'how to',
      'belajar',
      'cara',
      'ilmu',
      'skill',
    ],
    color: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'story',
    title: 'Personal stories',
    emoji: '🌷',
    words: [
      'story',
      'journey',
      'today',
      'experience',
      'life',
      'cerita',
      'pengalaman',
      'hari ini',
      'perjalanan',
    ],
    color: 'bg-pink-50 border-pink-200',
  },
  {
    id: 'question',
    title: 'Questions and discussions',
    emoji: '💬',
    words: [
      '?',
      'what do you think',
      'thoughts',
      'opinion',
      'menurut',
      'bagaimana',
      'pendapat',
      'diskusi',
    ],
    color: 'bg-sky-50 border-sky-200',
  },
  {
    id: 'creative',
    title: 'Creative inspiration',
    emoji: '🎨',
    words: [
      'design',
      'art',
      'creative',
      'photo',
      'music',
      'create',
      'kreatif',
      'desain',
      'foto',
      'karya',
    ],
    color: 'bg-violet-50 border-violet-200',
  },
];

const CHALLENGES = [
  {
    id: 'hook',
    emoji: '⚡',
    title: 'The Hook Remix',
    text: 'Try a new opening sentence for your next post.',
  },
  {
    id: 'question',
    emoji: '💬',
    title: 'Start a Conversation',
    text: 'Invite your audience to share a genuine thought.',
  },
  {
    id: 'story',
    emoji: '🌷',
    title: 'Tell a Tiny Story',
    text: 'Share one meaningful moment from your day.',
  },
];

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
    maximumFractionDigits: 1,
  }).format(value);
}

function postLabel(post: Post): string {
  const caption = post.caption.trim();

  return caption
    ? caption.slice(0, 95) + (caption.length > 95 ? '…' : '')
    : `Post #${post.id}`;
}

function median(values: number[]): number | null {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function gini(values: number[]): number | null {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  if (sum === 0) return null;

  const weighted = sorted.reduce(
    (total, value, index) => total + value * (index + 1),
    0
  );

  return (
    (2 * weighted) / (sorted.length * sum) - (sorted.length + 1) / sorted.length
  );
}

function topicFor(caption: string): Topic | null {
  const text = caption.toLowerCase();

  return (
    TOPICS.find((topic) =>
      topic.words.some((word) => {
        if (word === '?') return text.includes('?');

        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        return new RegExp(
          `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
          'u'
        ).test(text);
      })
    ) ?? null
  );
}

function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 text-[#25213B] shadow-sm sm:p-7'>
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
      <p className='line-clamp-2 text-sm font-semibold leading-6 text-[#25213B]'>
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

  if (!posts.length) {
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

  const sum = values.reduce((a, b) => a + b, 0);

  if (!values.length || sum === 0) {
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

  const [compareA, setCompareA] = useState('');

  const [compareB, setCompareB] = useState('');

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

    const topics = TOPICS.map((topic) => {
      const matches = posts.filter(
        (post) => topicFor(post.caption)?.id === topic.id
      );

      return {
        ...topic,
        matches,
        medianInteractions: median(matches.map((post) => post.total)),
      };
    });

    return {
      posts,
      ranked,
      topics,
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

  const first = analysis.posts.find((post) => String(post.id) === compareA);

  const second = analysis.posts.find((post) => String(post.id) === compareB);

  const filtered = analysis.posts
    .filter((post) =>
      `${post.caption} ${post.author}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    )
    .sort((a, b) => b[sortBy] - a[sortBy] || a.id - b.id);

  const activeTopics = analysis.topics.filter(
    (topic) => topic.matches.length > 0
  );

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
    setSelectedId(null);
  };

  return (
    <main className='min-h-screen bg-[#F8F6FF] px-4 py-6 text-[#25213B] sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        {/* LIVE DATA CONTROLS */}

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
                      : 'bg-emerald-500'
                }`}
              />

              <div>
                <p className='text-xs font-bold text-[#25213B]'>
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
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className='inline-flex items-center gap-2 rounded-xl bg-[#6936F2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5526D7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6936F2] disabled:opacity-60'
            >
              <RefreshCw
                size={16}
                className={query.isFetching ? 'motion-safe:animate-spin' : ''}
              />

              {query.isFetching ? 'Refreshing...' : 'Refresh insights'}
            </button>
          </div>
        </div>

        {/* WELCOME */}

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

            <p className='mt-3 text-xl font-semibold text-white sm:text-2xl'>
              This page is designed just for you.
            </p>

            <p className='mt-4 max-w-2xl text-sm leading-7 text-[#F0E9FF] sm:text-base'>
              Ever wondered what makes people connect with a post? Discover
              fresh inspiration, explore what your audience responds to, and
              find creative ideas to try next.
            </p>

            <p className='mt-3 text-sm font-semibold text-white'>
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

        {/* NAVIGATION */}

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

        {/* DATA SOURCE */}

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
                  setCompareA('');
                  setCompareB('');
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

        {/* LOADING */}

        {query.isPending && (
          <div className='flex items-center justify-center gap-3 rounded-2xl bg-white p-12 text-[#51466E]'>
            <LoaderCircle className='motion-safe:animate-spin' />
            Gathering your creator insights...
          </div>
        )}

        {/* ERROR */}

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
              onClick={() => query.refetch()}
              className='mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white'
            >
              Try again
            </button>
          </div>
        )}

        {query.data && (
          <>
            {/* DATA COVERAGE */}

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

            {/* SUMMARY METRICS */}

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

            {/* DISCOVER */}

            {tab === 'discover' && (
              <div className='space-y-6'>
                <Panel
                  title='Your Creator Opportunity Radar 🔭'
                  description="Let's discover content themes worth exploring. These are clues from loaded captions, not predictions of what will go viral."
                >
                  {activeTopics.length === 0 ? (
                    <div className='rounded-2xl bg-[#F8F6FF] p-6'>
                      <p className='font-bold'>
                        No clear themes detected yet 🌱
                      </p>

                      <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                        Your loaded captions do not match our simple theme
                        keywords. Explore more community posts to discover new
                        inspiration.
                      </p>
                    </div>
                  ) : (
                    <div className='grid gap-4 md:grid-cols-2'>
                      {activeTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className={`rounded-[22px] border p-5 ${topic.color}`}
                        >
                          <div className='flex items-start justify-between gap-3'>
                            <span className='text-3xl' aria-hidden='true'>
                              {topic.emoji}
                            </span>

                            <span className='rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#51466E]'>
                              {topic.matches.length} matching posts
                            </span>
                          </div>

                          <h3 className='mt-4 text-lg font-black'>
                            {topic.title}
                          </h3>

                          <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                            {topic.medianInteractions === null
                              ? 'No complete interaction counts available.'
                              : `Median recorded interactions: ${formatNumber(topic.medianInteractions)} per matching post.`}
                          </p>

                          <p className='mt-2 text-xs leading-5 text-[#736C82]'>
                            Themes are identified using caption keywords. Some
                            posts may be classified incorrectly.
                          </p>

                          <button
                            type='button'
                            onClick={() =>
                              setSelectedId(topic.matches[0]?.id ?? null)
                            }
                            className='mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#6936F2]'
                          >
                            Explore an example
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
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
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder='Search captions or creators'
                      aria-label='Search loaded posts'
                      className='min-w-0 flex-1 bg-transparent text-sm text-[#25213B] outline-none placeholder:text-[#90889D]'
                    />
                  </label>

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

            {/* IMPROVE */}

            {tab === 'improve' && (
              <div className='space-y-6'>
                <Panel
                  title='Fair Comparison Studio ⚖️'
                  description="Choose two posts. We'll compare what is recorded and explain what we cannot know."
                >
                  <div className='grid gap-4 md:grid-cols-2'>
                    {(
                      [
                        ['Post A', compareA, setCompareA],
                        ['Post B', compareB, setCompareB],
                      ] as const
                    ).map(([title, value, setter]) => (
                      <label key={title} className='block'>
                        <span className='mb-2 block text-sm font-bold'>
                          {title}
                        </span>

                        <select
                          value={value}
                          onChange={(event) => setter(event.target.value)}
                          className='w-full rounded-xl border border-[#DDD5F4] bg-white p-3 text-sm text-[#25213B] focus:outline-[#6936F2]'
                        >
                          <option value=''>Choose a post</option>

                          {analysis.posts.map((post) => (
                            <option key={post.id} value={String(post.id)}>
                              {postLabel(post)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  {first && second && first.id !== second.id ? (
                    <div className='mt-6 space-y-4'>
                      <div className='grid gap-4 sm:grid-cols-2'>
                        {[first, second].map((post, index) => (
                          <div
                            key={post.id}
                            className={`rounded-2xl p-5 ${
                              index === 0 ? 'bg-[#EEE8FF]' : 'bg-[#E5F7F6]'
                            }`}
                          >
                            <p className='text-xs font-bold uppercase tracking-wider'>
                              Post {index === 0 ? 'A' : 'B'}
                            </p>

                            <p className='mt-2 line-clamp-2 text-sm font-semibold'>
                              {postLabel(post)}
                            </p>

                            <p className='mt-4 text-4xl font-black'>
                              {post.total}
                            </p>

                            <p className='text-xs text-[#655B78]'>
                              Recorded interactions
                            </p>

                            <p className='mt-3 text-xs'>
                              {post.likes} likes and {post.comments} comments
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className='rounded-2xl border border-amber-200 bg-amber-50 p-5'>
                        <p className='flex items-center gap-2 font-bold text-amber-950'>
                          <ShieldCheck size={18} />
                          Is this a fair comparison?
                        </p>

                        <p className='mt-3 text-sm leading-7 text-amber-900'>
                          {first.total === second.total
                            ? 'These posts have the same number of recorded interactions.'
                            : `${
                                first.total > second.total ? 'Post A' : 'Post B'
                              } has ${Math.abs(first.total - second.total)} more recorded interactions.`}{' '}
                          We cannot conclude that one performed better because
                          exposure, audience size, and posting age are not
                          available for adjustment.
                        </p>

                        <p className='mt-2 text-xs leading-5 text-amber-900'>
                          Fairness status: insufficient information for a fully
                          adjusted comparison.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className='mt-5 rounded-2xl bg-[#F8F6FF] p-5 text-sm text-[#655B78]'>
                      Choose two different posts to compare their recorded
                      interactions.
                    </div>
                  )}
                </Panel>

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

                      <p className='mt-3 text-xs text-[#655B78]'>
                        Why try this? It is a testable content idea. The current
                        data cannot prove that questions cause more comments.
                      </p>
                    </div>

                    <div className='rounded-[22px] bg-[#E5F7F6] p-5'>
                      <span className='text-3xl' aria-hidden='true'>
                        🎨
                      </span>

                      <h3 className='mt-3 text-lg font-black'>
                        Revisit your standout post
                      </h3>

                      <p className='mt-2 text-sm leading-7 text-[#51466E]'>
                        {analysis.ranked[0]
                          ? `The highest interaction count in this sample is ${analysis.ranked[0].total}. Look at that post's opening line and consider testing a new variation.`
                          : 'Once you have analyzable posts, revisit one and try a different opening line.'}
                      </p>

                      <p className='mt-3 text-xs text-[#655B78]'>
                        This is an observation about loaded posts, not proof
                        that a particular format works best.
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
                    <ChevronDown size={16} />
                  </button>

                  {showWhy && (
                    <div className='mt-4 rounded-2xl border border-[#E4DCF8] bg-[#FBFAFF] p-5 text-sm leading-7 text-[#51466E]'>
                      These ideas use {analysis.posts.length} posts with
                      complete counts from the loaded {scope}. We observe
                      captions, likes, and comments. We do not observe reach,
                      impressions, audience demographics, or causal effects.
                      {partial ? ' More pages may still be available.' : ''}
                      {smallSample
                        ? ' The sample is small, so findings may be unstable.'
                        : ''}{' '}
                      We do not assign a statistical confidence percentage
                      without a justified estimation method.
                    </div>
                  )}
                </Panel>

                <Panel
                  title='Creator Challenge Corner 🎯'
                  description='Pick one creative experiment. The goal is to learn something useful, not chase a random number.'
                >
                  <div className='grid gap-3 md:grid-cols-3'>
                    {CHALLENGES.map((challenge) => (
                      <button
                        key={challenge.id}
                        type='button'
                        onClick={() => setActiveChallenge(challenge.id)}
                        aria-pressed={activeChallenge === challenge.id}
                        className={`rounded-2xl border p-5 text-left transition-colors ${
                          activeChallenge === challenge.id
                            ? 'border-[#6936F2] bg-[#EEE8FF]'
                            : 'border-[#E9E5F4] bg-white hover:bg-[#FBFAFF]'
                        }`}
                      >
                        <span className='text-3xl' aria-hidden='true'>
                          {challenge.emoji}
                        </span>

                        <p className='mt-3 font-bold'>{challenge.title}</p>

                        <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                          {challenge.text}
                        </p>

                        <p className='mt-4 flex items-center gap-2 text-xs font-bold text-[#6936F2]'>
                          {activeChallenge === challenge.id ? (
                            <>
                              <CheckCircle2 size={15} />
                              Challenge selected
                            </>
                          ) : (
                            <>
                              <Target size={15} />
                              Choose this challenge
                            </>
                          )}
                        </p>
                      </button>
                    ))}
                  </div>

                  <p className='mt-4 text-xs leading-6 text-[#736C82]'>
                    Your selection is kept in this page session. Persistent
                    challenge tracking will be added in a future step.
                  </p>
                </Panel>
              </div>
            )}

            {/* ADVANCED */}

            {tab === 'advanced' && (
              <div className='space-y-6'>
                <Panel
                  title='Data Quality Center 🛡️'
                  description="Great insights begin with reliable data. Here's what we can check about the posts currently loaded."
                >
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    <Metric
                      emoji='📦'
                      label='Records loaded'
                      value={formatNumber(analysis.rawCount)}
                      description='Records returned across loaded pages'
                      background='bg-[#EEE8FF]'
                    />

                    <Metric
                      emoji='📝'
                      label='Unique posts'
                      value={formatNumber(analysis.uniqueCount)}
                      description='Unique post IDs after deduplication'
                      background='bg-[#E5F7F6]'
                    />

                    <Metric
                      emoji='🔍'
                      label='Repeated records'
                      value={formatNumber(analysis.duplicates)}
                      description='Repeated IDs across loaded pages'
                      background='bg-[#FFF2DF]'
                    />

                    <Metric
                      emoji='🧩'
                      label='Incomplete counts'
                      value={formatNumber(analysis.missing)}
                      description='Posts missing valid likes or comments'
                      background='bg-[#FFEAF3]'
                    />
                  </div>

                  <div className='mt-5 rounded-2xl bg-[#F8F6FF] p-5'>
                    <h3 className='font-bold'>What does this mean?</h3>

                    <p className='mt-2 text-sm leading-7 text-[#655B78]'>
                      We remove repeated post IDs from the analysis. Posts with
                      missing interaction counts are excluded from calculations
                      that need both likes and comments.
                    </p>

                    <p className='mt-3 text-sm leading-7 text-[#655B78]'>
                      A missing value is not treated as zero. This helps avoid
                      misleading results.
                    </p>
                  </div>
                </Panel>

                <Panel
                  title='Analysis coverage 📚'
                  description='Understand how much data has been explored and whether more pages may be available.'
                >
                  <div className='grid gap-4 sm:grid-cols-3'>
                    <Metric
                      emoji='📄'
                      label='Pages loaded'
                      value={formatNumber(pagesLoaded)}
                      description={`Up to ${MAX_PAGES} pages per query`}
                      background='bg-[#EEE8FF]'
                    />

                    <Metric
                      emoji='📊'
                      label='Analyzed posts'
                      value={formatNumber(analysis.posts.length)}
                      description='Posts with complete interaction counts'
                      background='bg-[#E5F7F6]'
                    />

                    <Metric
                      emoji='🔭'
                      label='Coverage'
                      value={partial ? 'Partial' : 'No next page'}
                      description='Based on API pagination metadata'
                      background='bg-[#FFF2DF]'
                    />
                  </div>

                  <p className='mt-5 text-sm leading-7 text-[#655B78]'>
                    The analysis uses records returned by the Sociality API. It
                    does not claim to represent every post ever created on the
                    platform.
                  </p>

                  {reachedLimit && (
                    <p className='mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
                      The analysis reached its configured page limit. Additional
                      posts may exist beyond this sample.
                    </p>
                  )}
                </Panel>

                <Panel
                  title='Interaction concentration 📈'
                  description='Explore whether recorded interactions are spread across posts or concentrated in a smaller number of posts.'
                >
                  <div className='grid gap-5 lg:grid-cols-2'>
                    <div className='rounded-2xl bg-[#F8F6FF] p-5'>
                      <h3 className='font-bold'>Lorenz Curve</h3>

                      <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                        This curve shows how recorded interactions are
                        distributed among the posts we loaded.
                      </p>

                      <LorenzCurve posts={analysis.posts} />
                    </div>

                    <div className='space-y-3'>
                      <Metric
                        emoji='📊'
                        label='Median interactions'
                        value={
                          analysis.median === null
                            ? 'N/A'
                            : formatNumber(analysis.median)
                        }
                        description='The middle interaction count across analyzed posts'
                        background='bg-[#EEE8FF]'
                      />

                      <Metric
                        emoji='📐'
                        label='Gini coefficient'
                        value={
                          analysis.gini === null
                            ? 'N/A'
                            : analysis.gini.toFixed(3)
                        }
                        description='Describes inequality in recorded interactions'
                        background='bg-[#E5F7F6]'
                      />

                      <Metric
                        emoji='🔬'
                        label='HHI'
                        value={
                          analysis.hhi === null
                            ? 'N/A'
                            : analysis.hhi.toFixed(3)
                        }
                        description='Sum of squared interaction shares'
                        background='bg-[#FFF2DF]'
                      />

                      <Metric
                        emoji='🌟'
                        label='Top 10% share'
                        value={
                          analysis.topShare === null
                            ? 'N/A'
                            : `${formatNumber(analysis.topShare * 100)}%`
                        }
                        description={`Share of interactions among the ${analysis.topCount} highest ranked posts`}
                        background='bg-[#FFEAF3]'
                      />
                    </div>
                  </div>

                  <p className='mt-5 text-xs leading-6 text-[#736C82]'>
                    These are descriptive statistics calculated from loaded
                    posts. They do not measure content quality or explain why a
                    post received attention.
                  </p>
                </Panel>

                <Panel
                  title='How your insights work 🔍'
                  description="A little transparency goes a long way. Here's how we turn Sociality posts into useful observations."
                >
                  <div className='grid gap-3 md:grid-cols-2'>
                    {[
                      {
                        title: '1. Gather posts',
                        text: 'We request paginated post data from the Sociality API.',
                      },
                      {
                        title: '2. Check the data',
                        text: 'We validate counts and remove repeated post IDs.',
                      },
                      {
                        title: '3. Explore patterns',
                        text: 'We analyze recorded interactions and classify captions using simple keywords.',
                      },
                      {
                        title: '4. Explain limitations',
                        text: 'We identify missing information and avoid unsupported predictions.',
                      },
                    ].map((step) => (
                      <div
                        key={step.title}
                        className='rounded-2xl border border-[#E9E5F4] bg-[#FBFAFF] p-5'
                      >
                        <h3 className='font-bold'>{step.title}</h3>

                        <p className='mt-2 text-sm leading-7 text-[#655B78]'>
                          {step.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            )}

            {/* SELECTED POST */}

            {selected && (
              <section className='rounded-[26px] border border-[#DCD1FA] bg-white p-5 shadow-sm sm:p-7'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-xs font-bold uppercase tracking-wider text-[#6936F2]'>
                      Post Explorer
                    </p>

                    <h2 className='mt-2 text-xl font-black'>
                      Let's take a closer look 🔎
                    </h2>
                  </div>

                  <button
                    type='button'
                    onClick={() => setSelectedId(null)}
                    className='rounded-full bg-[#F3EEFF] px-3 py-2 text-xs font-bold text-[#6936F2]'
                  >
                    Close
                  </button>
                </div>

                <p className='mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#51466E]'>
                  {selected.caption || `Post #${selected.id}`}
                </p>

                <p className='mt-3 text-xs text-[#736C82]'>
                  By {selected.author}
                </p>

                <div className='mt-5 grid grid-cols-3 gap-3'>
                  <Metric
                    emoji='💜'
                    label='Likes'
                    value={formatNumber(selected.likes)}
                    description='Recorded likes'
                    background='bg-[#FFEAF3]'
                  />

                  <Metric
                    emoji='💬'
                    label='Comments'
                    value={formatNumber(selected.comments)}
                    description='Recorded comments'
                    background='bg-[#E5F7F6]'
                  />

                  <Metric
                    emoji='✨'
                    label='Interactions'
                    value={formatNumber(selected.total)}
                    description='Likes plus comments'
                    background='bg-[#EEE8FF]'
                  />
                </div>
              </section>
            )}

            {/* PAGINATION */}

            <section className='rounded-[26px] border border-[#E9E5F4] bg-white p-5 sm:p-7'>
              <div className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                  <h2 className='text-lg font-bold'>Keep exploring 🌍</h2>

                  <p className='mt-2 text-sm leading-6 text-[#655B78]'>
                    {formatNumber(analysis.uniqueCount)} unique posts loaded
                    across {pagesLoaded} pages.
                    {partial
                      ? ' More posts may be available.'
                      : ' No additional page is currently reported.'}
                  </p>
                </div>

                {query.hasNextPage && !reachedLimit && (
                  <button
                    type='button'
                    onClick={() => query.fetchNextPage()}
                    disabled={query.isFetching}
                    className='inline-flex items-center gap-2 rounded-xl bg-[#6936F2] px-5 py-3 text-sm font-bold text-white hover:bg-[#5526D7] disabled:opacity-60'
                  >
                    {query.isFetchingNextPage
                      ? 'Loading more...'
                      : 'Load more posts'}

                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </section>

            {/* FOOTER */}

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
