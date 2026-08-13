import { Activity, Apple, BookOpen, HeartPulse, Microscope, Stethoscope } from "lucide-react";

const themeMap: Record<string, { className: string; Icon: typeof HeartPulse }> = {
  gold: { className: "art-gold", Icon: Stethoscope },
  cyan: { className: "art-cyan", Icon: Microscope },
  green: { className: "art-green", Icon: Apple },
  teal: { className: "art-teal", Icon: Activity },
  violet: { className: "art-violet", Icon: BookOpen },
  orange: { className: "art-orange", Icon: HeartPulse },
  blue: { className: "art-blue", Icon: HeartPulse },
  rose: { className: "art-rose", Icon: BookOpen },
};

type CourseArtworkProps = {
  theme: string;
  category: string;
  title: string;
  compact?: boolean;
};

export default function CourseArtwork({ theme, category, title, compact = false }: CourseArtworkProps) {
  const config = themeMap[theme] ?? themeMap.cyan;
  const Icon = config.Icon;

  return (
    <div className={`course-art ${config.className} ${compact ? "course-art--compact" : ""}`}>
      <div className="course-art__grain" />
      <div className="course-art__rings" />
      <Icon aria-hidden="true" className="course-art__symbol" strokeWidth={1.15} />
      <div className="course-art__copy">
        <span>{category}</span>
        <strong>{title}</strong>
      </div>
    </div>
  );
}
