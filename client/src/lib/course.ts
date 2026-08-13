export type CourseSummary = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  durationMinutes: number;
  publishedAt: Date;
  reviewedAt: Date;
  thumbnailTheme: string;
  previewLabel: string;
  isFeatured: boolean;
  category: { id: number; slug: string; name: string; description: string };
  doctor: { id: number; slug: string; name: string; specialty: string; affiliation: string; initials: string };
};

export type CourseDetail = CourseSummary & {
  description: string;
  intendedFor: string;
  learningPoints: string;
  referencesText: string;
  coiText: string;
  doctorProfile: string;
};

export const formatYen = (value: number) => `¥${new Intl.NumberFormat("ja-JP").format(value)}`;

export const formatDate = (value: Date | string) => new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
}).format(new Date(value));

export const splitText = (value: string) => value.split("|").filter(Boolean);
