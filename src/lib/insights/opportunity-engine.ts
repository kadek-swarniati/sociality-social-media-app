export type RadarPost = {
  id: number;
  caption: string;
  author: string;
  likes: number;
  comments: number;
  total: number;
};

export type TopicDefinition = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  keywords: string[];
  color: string;
};

export type TopicEvidence = {
  post: RadarPost;
  matchedKeywords: string[];
};

export type TopicInsight = {
  topic: TopicDefinition;
  evidence: TopicEvidence[];
  count: number;
  medianLikes: number | null;
  medianComments: number | null;
  medianInteractions: number | null;
  medianWithoutTopPost: number | null;
  sensitivityDifference: number | null;
  evidenceLabel: string;
  caution: string;
};

export const RADAR_TOPICS: TopicDefinition[] = [
  {
    id: 'learning',
    title: 'Learning and tips',
    emoji: '💡',
    description: 'Helpful lessons, practical advice, and useful discoveries.',
    keywords: [
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
    color: 'amber',
  },
  {
    id: 'story',
    title: 'Personal stories',
    emoji: '🌷',
    description: 'Experiences, everyday moments, and personal journeys.',
    keywords: [
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
    color: 'pink',
  },
  {
    id: 'discussion',
    title: 'Questions and conversations',
    emoji: '💬',
    description: 'Posts that invite people to share their thoughts.',
    keywords: [
      '?',
      'what do you think',
      'thoughts',
      'opinion',
      'question',
      'menurut',
      'bagaimana',
      'pendapat',
      'diskusi',
    ],
    color: 'sky',
  },
  {
    id: 'creative',
    title: 'Creative inspiration',
    emoji: '🎨',
    description: 'Ideas about design, art, music, and making things.',
    keywords: [
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
    color: 'violet',
  },
];

export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);

  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchedKeywordsFor(
  caption: string,
  topic: TopicDefinition
): string[] {
  const normalized = caption.normalize('NFKC').toLocaleLowerCase();

  return topic.keywords.filter((keyword) => {
    if (keyword === '?') {
      return normalized.includes('?');
    }

    const expression = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escapeRegExp(keyword)}(?=$|[^\\p{L}\\p{N}])`,
      'u'
    );

    return expression.test(normalized);
  });
}

export function classifyPost(caption: string): Array<{
  topic: TopicDefinition;
  keywords: string[];
}> {
  return RADAR_TOPICS.flatMap((topic) => {
    const keywords = matchedKeywordsFor(caption, topic);

    return keywords.length > 0 ? [{ topic, keywords }] : [];
  });
}

export function buildOpportunityRadar(
  posts: RadarPost[],
  partialCoverage: boolean
): TopicInsight[] {
  const unique = new Map<number, RadarPost>();

  for (const post of posts) {
    if (
      !Number.isSafeInteger(post.id) ||
      post.id <= 0 ||
      !Number.isSafeInteger(post.likes) ||
      post.likes < 0 ||
      !Number.isSafeInteger(post.comments) ||
      post.comments < 0
    ) {
      continue;
    }

    if (!unique.has(post.id)) {
      unique.set(post.id, {
        ...post,
        total: post.likes + post.comments,
      });
    }
  }

  const validPosts = [...unique.values()];

  return RADAR_TOPICS.map((topic): TopicInsight => {
    const evidence = validPosts.flatMap((post) => {
      const matchedKeywords = matchedKeywordsFor(post.caption, topic);

      return matchedKeywords.length
        ? [
            {
              post,
              matchedKeywords,
            },
          ]
        : [];
    });

    const totals = evidence.map((item) => item.post.total);

    const medianInteractions = medianOf(totals);

    const sortedDescending = [...evidence].sort(
      (a, b) => b.post.total - a.post.total || a.post.id - b.post.id
    );

    const withoutTop = sortedDescending.slice(1).map((item) => item.post.total);

    const medianWithoutTopPost = medianOf(withoutTop);

    const sensitivityDifference =
      medianInteractions !== null && medianWithoutTopPost !== null
        ? Math.abs(medianInteractions - medianWithoutTopPost)
        : null;

    const count = evidence.length;

    const evidenceLabel =
      count < 5
        ? 'Very limited evidence'
        : count < 15
          ? 'Early observation'
          : 'More examples available';

    const cautions: string[] = [];

    if (count < 5) {
      cautions.push('Only a few matching posts are available.');
    }

    if (partialCoverage) {
      cautions.push('More posts may still be available.');
    }

    if (
      sensitivityDifference !== null &&
      medianInteractions !== null &&
      sensitivityDifference > Math.max(2, medianInteractions * 0.25)
    ) {
      cautions.push(
        'The median changes noticeably when the highest interaction post is excluded.'
      );
    }

    if (cautions.length === 0) {
      cautions.push('These are descriptive observations, not predictions.');
    }

    return {
      topic,
      evidence,
      count,
      medianLikes: medianOf(evidence.map((item) => item.post.likes)),
      medianComments: medianOf(evidence.map((item) => item.post.comments)),
      medianInteractions,
      medianWithoutTopPost,
      sensitivityDifference,
      evidenceLabel,
      caution: cautions.join(' '),
    };
  }).sort(
    (a, b) => b.count - a.count || a.topic.title.localeCompare(b.topic.title)
  );
}
