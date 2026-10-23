export type CreatorPost = {
  id: number;
  caption: string;
  author: string;
  likes: number;
  comments: number;
  total: number;
};

export type DataAudit = {
  rawCount: number;
  uniqueCount: number;
  duplicates: number;
  missing: number;
  pagesLoaded: number;
  partialCoverage: boolean;
};

export type CreatorRecommendation = {
  id: string;
  title: string;
  action: string;
  explanation: string;
  evidence: string;
  caution: string;
};

export function getCreatorRecommendations(
  posts: CreatorPost[],
  audit: DataAudit
): CreatorRecommendation[] {
  const count = posts.length;
  const withQuestions = posts.filter((post) => /\?/.test(post.caption));
  const withQuestionsCount = withQuestions.length;
  const withoutQuestionsCount = count - withQuestionsCount;

  const median = (values: number[]): number | null => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  };

  const questionMedian = median(withQuestions.map((post) => post.comments));
  const otherMedian = median(
    posts
      .filter((post) => !/\?/.test(post.caption))
      .map((post) => post.comments)
  );

  const evidence = [
    `${count} posts with complete counts`,
    audit.partialCoverage
      ? 'Additional pages may exist'
      : 'No further API page reported',
    audit.missing > 0
      ? `${audit.missing} posts excluded for incomplete counts`
      : 'No missing interaction counts among unique loaded posts',
  ].join('. ');

  const recommendations: CreatorRecommendation[] = [
    {
      id: 'conversation',
      title: 'Try a thoughtful question 💬',
      action:
        'Create a post with one genuine open-ended question. Record its comments after a consistent observation window.',
      explanation:
        withQuestionsCount > 0 && withoutQuestionsCount > 0
          ? `Among loaded posts, ${withQuestionsCount} captions contain a question mark. Their median recorded comments are ${questionMedian ?? 'unavailable'}, versus ${otherMedian ?? 'unavailable'} for other captions.`
          : 'There are not enough examples in both caption groups for a descriptive comparison.',
      evidence,
      caution:
        'A question mark is only a text heuristic. This comparison does not establish that asking questions causes more comments.',
    },
    {
      id: 'hook',
      title: 'Experiment with your opening ⚡',
      action:
        'Write two alternative opening sentences for a similar topic. Publish one version, then document the outcome.',
      explanation: `There are ${count} complete posts available for exploring examples of different caption styles.`,
      evidence,
      caution:
        'The API does not identify which opening style caused an interaction. Treat this as an experiment idea, not a prediction.',
    },
    {
      id: 'story',
      title: 'Share something useful 🌷',
      action:
        'Tell a short real story, explain what you learned, and invite readers to reflect.',
      explanation:
        'A personal story can be tested as a creative format, but the available fields do not identify story quality or audience exposure.',
      evidence,
      caution:
        'This is a creative suggestion, not an empirically validated performance claim.',
    },
  ];

  return recommendations;
}

export function createInsightSummary(
  posts: CreatorPost[],
  audit: DataAudit
): string {
  const likes = posts.reduce((sum, post) => sum + post.likes, 0);
  const comments = posts.reduce((sum, post) => sum + post.comments, 0);

  return [
    'Sociality Creator Playground',
    'Descriptive insight snapshot',
    '',
    `Analyzed posts: ${posts.length}`,
    `Recorded likes: ${likes}`,
    `Recorded comments: ${comments}`,
    `Recorded interactions: ${likes + comments}`,
    `Duplicate rows detected: ${audit.duplicates}`,
    `Posts excluded for incomplete counts: ${audit.missing}`,
    `API pages loaded: ${audit.pagesLoaded}`,
    `More pages may exist: ${audit.partialCoverage ? 'Yes' : 'No'}`,
    '',
    'Source: currently loaded Sociality API data.',
    'Likes plus comments are not engagement rate.',
    'No viral prediction, causal inference, or exposure adjustment is claimed.',
  ].join('\n');
}

export function getDistribution(posts: CreatorPost[]): {
  label: string;
  count: number;
}[] {
  const totals = posts.map((post) => post.total);

  if (!totals.length) return [];

  const sorted = [...totals].sort((a, b) => a - b);

  const quantile = (fraction: number): number => {
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  const q1 = quantile(0.25);
  const q2 = quantile(0.5);
  const q3 = quantile(0.75);

  const buckets = [
    { label: 'At or below Q1', count: 0 },
    { label: 'Q1 to median', count: 0 },
    { label: 'Median to Q3', count: 0 },
    { label: 'Above Q3', count: 0 },
  ];

  for (const value of totals) {
    if (value <= q1) buckets[0].count++;
    else if (value <= q2) buckets[1].count++;
    else if (value <= q3) buckets[2].count++;
    else buckets[3].count++;
  }

  return buckets;
}
