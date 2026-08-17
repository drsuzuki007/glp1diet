import React from "react";
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StreamingCourseRow } from "../client/src/components/StreamingCourseRow";
import { catalogRowCoursesSchema, catalogRowOrderSchema } from "./routers";

vi.mock("../client/src/components/CourseArtwork", () => ({ default: ({ title }: { title: string }) => <div>{`${title}のサムネイル`}</div> }));
vi.mock("wouter", () => ({ Link: (props: any) => <a {...props}>{props.children}</a> }));

describe("catalog row configuration", () => {
  afterEach(cleanup);

  it("accepts row and course ordering payloads while rejecting invalid identifiers", () => {
    expect(catalogRowOrderSchema.parse([3, 1, 2])).toEqual([3, 1, 2]);
    expect(catalogRowCoursesSchema.parse({ rowId: 2, courseIds: [8, 3, 10] })).toEqual({ rowId: 2, courseIds: [8, 3, 10] });
    expect(() => catalogRowOrderSchema.parse([0])).toThrow();
    expect(() => catalogRowCoursesSchema.parse({ rowId: 1, courseIds: Array.from({ length: 201 }, (_, index) => index + 1) })).toThrow();
  });
});

/** @vitest-environment jsdom */
describe("StreamingCourseRow", () => {
  afterEach(cleanup);

  it("renders course links and scrolls the current row one viewport at a time", () => {
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", { configurable: true, value: scrollBy });
    const course = { id: 11, slug: "movement-routine", title: "日常に取り入れる運動習慣", summary: "要約", durationMinutes: 32, publishedAt: new Date(), reviewedAt: new Date(), thumbnailTheme: "teal", previewLabel: "無料プレビューを再生", isFeatured: false, category: { id: 1, slug: "food-lifestyle", name: "食事・生活習慣", description: "" }, doctor: { id: 2, slug: "seiji-nomura", name: "野村 誠司 医師", specialty: "循環器内科", affiliation: "", initials: "SN" } };
    render(<StreamingCourseRow row={{ id: 1, slug: "lifestyle", name: "食事・運動と生活習慣", description: "日常の選択を見直す講座", courses: [course] }} />);
    expect(screen.getByRole("link", { name: /日常に取り入れる運動習慣/ }).getAttribute("href")).toBe("/courses/movement-routine");
    fireEvent.click(screen.getByRole("button", { name: "食事・運動と生活習慣を右へスクロール" }));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
  });

  it("opens a course on a normal click while preventing navigation after a horizontal drag", () => {
    Object.defineProperties(HTMLElement.prototype, {
      setPointerCapture: { configurable: true, value: vi.fn() },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: vi.fn() },
    });
    const course = { id: 11, slug: "movement-routine", title: "日常に取り入れる運動習慣", summary: "要約", durationMinutes: 32, publishedAt: new Date(), reviewedAt: new Date(), thumbnailTheme: "teal", previewLabel: "無料プレビューを再生", isFeatured: false, category: { id: 1, slug: "food-lifestyle", name: "食事・生活習慣", description: "" }, doctor: { id: 2, slug: "seiji-nomura", name: "野村 誠司 医師", specialty: "循環器内科", affiliation: "", initials: "SN" } };
    const { container } = render(<StreamingCourseRow row={{ id: 1, slug: "lifestyle", name: "食事・運動と生活習慣", description: "日常の選択を見直す講座", courses: [course] }} />);
    const link = screen.getByRole("link", { name: /日常に取り入れる運動習慣/ });
    const normalClick = createEvent.click(link);
    fireEvent(link, normalClick);
    expect(normalClick.defaultPrevented).toBe(false);

    const track = container.querySelector(".streaming-row__track")!;
    fireEvent.pointerDown(track, { button: 0, clientX: 260, pointerId: 7 });
    fireEvent.pointerMove(track, { clientX: 220, pointerId: 7 });
    const dragClick = createEvent.click(link);
    fireEvent(link, dragClick);
    expect(dragClick.defaultPrevented).toBe(true);
  });
});
