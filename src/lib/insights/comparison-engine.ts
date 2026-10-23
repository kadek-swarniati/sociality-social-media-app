export type ComparisonPost = {
  id: number;
  caption: string;
  author: string;
  likes: number;
  comments: number;
  total: number;
};

export type ComparisonMetric = {
  label: string;
  first: number;
  second: number;
  difference: number;
  absoluteDifference: number;
  leader: 'first' | 'second' | 'tie';
};

export type ComparisonResult = {
  valid: boolean;
  reason: string | null;
  metrics: ComparisonMetric[];
  warnings: string[];
  conclusion: string;
  fairnessStatus: 'limited' | 'unavailable';
};

function isValidCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function createMetric(
  label: string,
  first: number,
  second: number
): ComparisonMetric {
  const difference = first - second;

  return {
    label,
    first,
    second,
    difference,
    absoluteDifference: Math.abs(difference),
    leader: difference > 0 ? 'first' : difference < 0 ? 'second' : 'tie',
  };
}

export function comparePosts(
  first: ComparisonPost | null,
  second: ComparisonPost | null
): ComparisonResult {
  const unavailable = (reason: string): ComparisonResult => ({
    valid: false,
    reason,
    metrics: [],
    warnings: [],
    conclusion: '',
    fairnessStatus: 'unavailable',
  });

  if (!first || !second) {
    return unavailable('Choose two posts to compare.');
  }

  if (first.id === second.id) {
    return unavailable(
      'Choose two different posts for a meaningful comparison.'
    );
  }

  const counts = [first.likes, first.comments, second.likes, second.comments];

  if (!counts.every(isValidCount)) {
    return unavailable('Both posts need valid recorded likes and comments.');
  }

  const firstTotal = first.likes + first.comments;
  const secondTotal = second.likes + second.comments;

  if (!Number.isSafeInteger(firstTotal) || !Number.isSafeInteger(secondTotal)) {
    return unavailable(
      'The recorded interaction totals exceed the supported numeric range.'
    );
  }

  const metrics = [
    createMetric('Likes', first.likes, second.likes),
    createMetric('Comments', first.comments, second.comments),
    createMetric('Total interactions', firstTotal, secondTotal),
  ];

  const difference = firstTotal - secondTotal;

  const conclusion =
    difference === 0
      ? 'Both posts have the same recorded interaction total.'
      : `Post ${difference > 0 ? 'A' : 'B'} has ${Math.abs(
          difference
        ).toLocaleString(
          'en-US'
        )} more recorded interactions in the available data.`;

  return {
    valid: true,
    reason: null,
    metrics,
    warnings: [
      'Reach and impressions are unavailable, so exposure cannot be adjusted.',
      'Posting age is unavailable, so observation windows may differ.',
      'Audience size and composition are unavailable.',
      'Recorded interactions do not establish causal effects or content quality.',
    ],
    conclusion,
    fairnessStatus: 'limited',
  };
}
