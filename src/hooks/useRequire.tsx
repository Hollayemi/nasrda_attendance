import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import type { Me } from '@/types';

/** Guards an admin screen: bounces to Home when the signed-in user lacks the permission flag. */
export function RequirePerm({ perm, children }: { perm: keyof Me; children: React.ReactNode }) {
  const { me } = useAuth();
  if (!me?.[perm]) return <Redirect href="/" />;
  return <>{children}</>;
}
