import { api } from '@/lib/api/client';

export type FeedParams = {
  page: number;
  limit?: number;
};

export async function getFeed({
  page,
  limit = 10,
}: FeedParams): Promise<unknown> {
  const response = await api.get<unknown>('/feed', {
    params: {
      page,
      limit,
    },
  });

  return response.data;
}
