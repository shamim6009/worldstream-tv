import {
  Baby,
  BookHeart,
  BookOpen,
  Clapperboard,
  CloudSun,
  Compass,
  Film,
  GraduationCap,
  Landmark,
  Music,
  Newspaper,
  TrendingUp,
  Trophy,
  Tv,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Newspaper,
  TrendingUp,
  Trophy,
  Clapperboard,
  Film,
  Music,
  Baby,
  Compass,
  UtensilsCrossed,
  Landmark,
  GraduationCap,
  BookOpen,
  BookHeart,
  CloudSun,
  Users,
};

export function CategoryIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Tv;
  return <Icon className={className} aria-hidden="true" />;
}
