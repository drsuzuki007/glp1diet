import { ArrowUpRight, Clock3, UserRound } from "lucide-react";
import { Link } from "wouter";
import CourseArtwork from "./CourseArtwork";
import type { CourseSummary } from "@/lib/course";

export default function CourseCard({ course, featured = false }: { course: CourseSummary; featured?: boolean }) {
  return (
    <Link href={`/courses/${course.slug}`} className={`course-card ${featured ? "course-card--featured" : ""}`}>
      <div className="course-card__art-wrap">
        <CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact />
        <span className="course-card__arrow"><ArrowUpRight size={16} /></span>
      </div>
      <div className="course-card__content">
        <span className="eyebrow eyebrow--aqua">{course.category.name}</span>
        <h3>{course.title}</h3>
        <p>{course.summary}</p>
        <div className="course-card__meta">
          <span><UserRound size={13} />{course.doctor.name}</span>
          <span><Clock3 size={13} />{course.durationMinutes}分</span>
        </div>
      </div>
    </Link>
  );
}
