import type { ReactNode } from 'react';

import SocialityPageShell from '@/components/navigation/sociality-page-shell';

export default function PublicUsersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SocialityPageShell>{children}</SocialityPageShell>;
}
