import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Play, UserRound } from "lucide-react";
import { Link } from "wouter";
import CourseArtwork from "@/components/CourseArtwork";
import type { CourseSummary } from "@/lib/course";

type StreamingCatalogRow = { id: number; slug: string; name: string; description: string; courses: CourseSummary[] };

export function StreamingCourseRow({ row, showDescription = true }: { row: StreamingCatalogRow; showDescription?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.88, 260), behavior: "smooth" });
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return;
    event.currentTarget.scrollLeft = pointerStart.current.scrollLeft - (event.clientX - pointerStart.current.x);
  };

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  };

  if (row.courses.length === 0) return null;
  return <section className="streaming-row" aria-labelledby={`streaming-row-${row.slug}`}>
    <div className="streaming-row__header"><div><h2 id={`streaming-row-${row.slug}`}>{row.name}</h2>{showDescription && <p>{row.description}</p>}</div><span>{row.courses.length}講座</span></div>
    <div className="streaming-row__viewport">
      <button className="streaming-row__arrow streaming-row__arrow--left" type="button" onClick={() => scrollByPage(-1)} aria-label={`${row.name}を左へスクロール`}><ChevronLeft size={23} /></button>
      <div ref={trackRef} className={`streaming-row__track ${isDragging ? "is-dragging" : ""}`} onWheel={event => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { event.preventDefault(); event.currentTarget.scrollLeft += event.deltaY; } }} onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
        {row.courses.map(course => <Link key={`${row.id}-${course.id}`} href={`/courses/${course.slug}`} className="streaming-course-card" draggable={false}>
          <div className="streaming-course-card__art"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact /><span className="streaming-course-card__play"><Play size={16} fill="currentColor" /></span></div>
          <div className="streaming-course-card__body"><span>{course.category.name}</span><h3>{course.title}</h3><div><span><UserRound size={12} />{course.doctor.name.replace(" 医師", "")}</span><span><Clock3 size={12} />{course.durationMinutes}分</span></div></div>
        </Link>)}
      </div>
      <button className="streaming-row__arrow streaming-row__arrow--right" type="button" onClick={() => scrollByPage(1)} aria-label={`${row.name}を右へスクロール`}><ChevronRight size={23} /></button>
    </div>
  </section>;
}
