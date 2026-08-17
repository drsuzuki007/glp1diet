import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Play, UserRound } from "lucide-react";
import { Link } from "wouter";
import CourseArtwork from "@/components/CourseArtwork";
import type { CourseSummary } from "@/lib/course";

type StreamingCatalogRow = { id: number; slug: string; name: string; description: string; courses: CourseSummary[] };

export function StreamingCourseRow({ row, showDescription = true }: { row: StreamingCatalogRow; showDescription?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const suppressCardClick = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollState, setScrollState] = useState({ canMoveLeft: false, canMoveRight: true });

  const syncScrollState = () => {
    const track = trackRef.current;
    if (!track) return;
    const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
    setScrollState({ canMoveLeft: track.scrollLeft > 4, canMoveRight: track.scrollLeft < maximum - 4 });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const frame = requestAnimationFrame(syncScrollState);
    const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(syncScrollState);
    resizeObserver?.observe(track);
    track.addEventListener("scroll", syncScrollState, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      track.removeEventListener("scroll", syncScrollState);
    };
  }, []);

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.88, 260), behavior: "smooth" });
    requestAnimationFrame(syncScrollState);
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    pointerStart.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
    suppressCardClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return;
    const distance = event.clientX - pointerStart.current.x;
    if (Math.abs(distance) > 7) {
      suppressCardClick.current = true;
      setIsDragging(true);
      event.currentTarget.scrollLeft = pointerStart.current.scrollLeft - distance;
    }
  };

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    window.setTimeout(() => { suppressCardClick.current = false; }, 0);
  };

  if (row.courses.length === 0) return null;
  return <section className="streaming-row" aria-labelledby={`streaming-row-${row.slug}`}>
    <div className="streaming-row__header"><div><h2 id={`streaming-row-${row.slug}`}>{row.name}</h2>{showDescription && <p>{row.description}</p>}</div><span>{row.courses.length}講座</span></div>
    <div className="streaming-row__viewport">
      <button className={`streaming-row__arrow streaming-row__arrow--left ${scrollState.canMoveLeft ? "is-available" : "is-unavailable"}`} type="button" onClick={() => scrollByPage(-1)} aria-label={`${row.name}を左へスクロール`}><ChevronLeft size={21} /><span>戻る</span></button>
      <div ref={trackRef} className={`streaming-row__track ${isDragging ? "is-dragging" : ""}`} onScroll={syncScrollState} onWheel={event => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { event.preventDefault(); event.currentTarget.scrollLeft += event.deltaY; } }} onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
        {row.courses.map(course => <Link key={`${row.id}-${course.id}`} href={`/courses/${course.slug}`} className="streaming-course-card" draggable={false} onClick={event => { if (suppressCardClick.current) { event.preventDefault(); event.stopPropagation(); } }}>
          <div className="streaming-course-card__art"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact /><span className="streaming-course-card__play"><Play size={16} fill="currentColor" /></span></div>
          <div className="streaming-course-card__body"><span>{course.category.name}</span><h3>{course.title}</h3><div><span><UserRound size={12} />{course.doctor.name.replace(" 医師", "")}</span><span><Clock3 size={12} />{course.durationMinutes}分</span></div></div>
        </Link>)}
      </div>
      <button className="streaming-row__arrow streaming-row__arrow--right is-available" type="button" onClick={() => scrollByPage(1)} aria-label={`${row.name}を右へスクロール`}><span>次へ</span><ChevronRight size={21} /></button>
    </div>
  </section>;
}
