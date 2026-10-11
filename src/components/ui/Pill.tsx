import { Text, View } from 'react-native';

export type Tone = 'green' | 'red' | 'amber' | 'navy' | 'gray';
const tones: Record<Tone, [string, string]> = {
  green: ['bg-tint-green', 'text-tint-green-text'],
  red: ['bg-tint-red', 'text-tint-red-text'],
  amber: ['bg-tint-amber', 'text-tint-amber-text'],
  navy: ['bg-navy-50', 'text-navy'],
  gray: ['bg-surface-line', 'text-ink-muted'],
};
export function Pill({ label, tone = 'navy', className = '' }: { label: string; tone?: Tone; className?: string }) {
  const [bg, fg] = tones[tone];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg} ${className}`}>
      <Text className={`text-[11px] font-bold tracking-wide ${fg}`}>{label}</Text>
    </View>
  );
}

import type { ApprovalState } from '@/types';
export const approvalTone: Record<ApprovalState, Tone> = { pending: 'amber', approved: 'green', rejected: 'red', recalled: 'navy' };
export const approvalLabel = (s: ApprovalState) => (s === 'pending' ? 'IN REVIEW' : s.toUpperCase());
