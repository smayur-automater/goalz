import type { LifeAreaKey } from '@goalz/tokens';
import {
  BookOpen,
  Briefcase,
  ChartColumn,
  Dumbbell,
  Flower2,
  GraduationCap,
  HeartPulse,
  House,
  Palette,
  PiggyBank,
  Puzzle,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type { LucideIcon };

export const areaIcons: Record<LifeAreaKey, LucideIcon> = {
  career: Briefcase,
  financial: PiggyBank,
  investments: TrendingUp,
  health: HeartPulse,
  fitness: Dumbbell,
  education: BookOpen,
  academics: GraduationCap,
  hobbies: Palette,
  social: Users,
  logic: Puzzle,
  analytics: ChartColumn,
  mindfulness: Flower2,
  family: House,
};

export interface IconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  /** Flip horizontally in right-to-left layouts (arrows, chevrons, "back"). */
  mirrorInRTL?: boolean;
}

/**
 * Decorative icon. Always hidden from screen readers: the control that contains it
 * must carry the accessible name (and, in Simple mode, a visible text label).
 */
export function Icon({ icon: Glyph, size = 20, color, mirrorInRTL = false }: IconProps) {
  const theme = useTheme();
  const flip = mirrorInRTL && theme.direction === 'rtl';
  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Glyph size={size} color={color ?? theme.colors.text} strokeWidth={2} />
    </View>
  );
}
