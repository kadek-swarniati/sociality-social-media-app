import { api } from '@/lib/api/client';

export type FeedParams = {
  page: number;
  limit?: number;
};

export async function getFeed({
  page,
  limit = 10,
}: FeedParams): Promise<unknown> {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Feed page must be a positive integer.');
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Feed limit must be a positive integer.');
  }

  const response = await api.get<unknown>('/feed', {
    params: {
      page,
      limit,
    },
  });

  return response.data;
}
