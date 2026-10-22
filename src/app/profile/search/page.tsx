import { redirect } from 'next/navigation';

export default function ProfileSearchRedirectPage() {
  redirect('/users/search');
}
