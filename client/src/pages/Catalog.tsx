import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, FilterX, Play, Search, SlidersHorizontal } from "lucide-react";
import { Link, useSearch } from "wouter";
import CourseArtwork from "@/components/CourseArtwork";
import SiteFrame from "@/components/SiteFrame";
import { StreamingCourseRow } from "@/components/StreamingCourseRow";
import type { CourseSummary } from "@/lib/course";
import { trpc } from "@/lib/trpc";

type CatalogForm = { search: string; category: string; duration: "" | "under30" | "30to45" | "over45"; doctor: string; published: "" | "month" | "quarter" | "year"; sort: "newest" | "duration" };
const emptyForm: CatalogForm = { search: "", category: "", duration: "", doctor: "", published: "", sort: "newest" };

function getFormFromSearch(value: string): CatalogForm {
  const params = new URLSearchParams(value);
  return { ...emptyForm, search: params.get("search") ?? "", category: params.get("category") ?? "" };
}

export default function Catalog() {
  const urlSearch = useSearch();
  const [filters, setFilters] = useState<CatalogForm>(() => getFormFromSearch(urlSearch));
  const filtersQuery = trpc.catalog.filters.useQuery();
  const rowsQuery = trpc.catalog.rows.useQuery();
  const featuredQuery = trpc.catalog.featured.useQuery();
  const courseQueryInput = useMemo(() => ({ search: filters.search || undefined, category: filters.category || undefined, duration: filters.duration || undefined, doctor: filters.doctor || undefined, published: filters.published || undefined, sort: filters.sort }), [filters]);
  const filteredCoursesQuery = trpc.catalog.list.useQuery(courseQueryInput, { enabled: Object.entries(filters).some(([key, value]) => key !== "sort" && value !== "") });

  useEffect(() => setFilters(getFormFromSearch(urlSearch)), [urlSearch]);
  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  const reset = () => setFilters(emptyForm);
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "sort" && value !== "");
  const featured = featuredQuery.data;
  const filteredRow = hasFilters ? [{ id: -1, slug: "filtered-results", name: "検索・絞り込み結果", description: "指定した条件に合う講座", courses: (filteredCoursesQuery.data ?? []) as CourseSummary[] }] : [];
  const rows = hasFilters ? filteredRow : (rowsQuery.data ?? []);

  return <SiteFrame>
    <section className="catalog-streaming-hero">
      <div className="catalog-streaming-hero__aura" />
      <div className="container catalog-streaming-hero__grid">
        <div><span className="eyebrow eyebrow--gold">MEDICAL VIDEO LIBRARY</span><h1>学びたいテーマから、<br />動画を選ぶ。</h1><p>カテゴリごとに横へ並ぶ講座から、今の関心に合う動画を選べます。加入中はすべての講座をページ内で視聴できます。</p>{featured && <div className="catalog-streaming-hero__actions"><Link href={`/courses/${featured.slug}`} className="button-primary"><Play size={17} fill="currentColor" />注目動画を再生</Link><a href="#catalog-shelves" className="button-secondary">すべての行を見る <ArrowRight size={16} /></a></div>}</div>
        {featured && <Link href={`/courses/${featured.slug}`} className="catalog-streaming-hero__featured" aria-label={`${featured.title}の詳細へ`}><CourseArtwork theme={featured.thumbnailTheme} category={featured.category.name} title={featured.title} /><div><span>FEATURED VIDEO</span><strong>{featured.title}</strong><small>{featured.doctor.name} ・ {featured.durationMinutes}分</small></div></Link>}
      </div>
    </section>
    <section className="catalog-streaming" id="catalog-shelves"><div className="container">
      <details className="streaming-filter-panel" open={hasFilters}><summary><span><SlidersHorizontal size={17} />検索・絞り込み</span><span>条件を指定する</span></summary><div className="streaming-filter-panel__body"><label className="catalog-search"><Search size={18} /><input name="search" value={filters.search} onChange={update} placeholder="タイトル、講師名、テーマから検索" /></label><div className="filter-grid"><label><span>カテゴリ</span><select name="category" value={filters.category} onChange={update}><option value="">すべてのカテゴリ</option>{filtersQuery.data?.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label><label><span>再生時間</span><select name="duration" value={filters.duration} onChange={update}><option value="">すべて</option><option value="under30">30分未満</option><option value="30to45">30〜45分</option><option value="over45">45分超</option></select></label><label><span>制作医師</span><select name="doctor" value={filters.doctor} onChange={update}><option value="">すべて</option>{filtersQuery.data?.doctors.map(doctor => <option key={doctor.slug} value={doctor.slug}>{doctor.name}</option>)}</select></label><label><span>公開日</span><select name="published" value={filters.published} onChange={update}><option value="">すべて</option><option value="month">過去1か月</option><option value="quarter">過去3か月</option><option value="year">過去1年</option></select></label><label><span>並べ替え</span><select name="sort" value={filters.sort} onChange={update}><option value="newest">新着順</option><option value="duration">再生時間が長い順</option></select></label></div>{hasFilters && <button type="button" className="reset-button" onClick={reset}><FilterX size={15} />条件をリセット</button>}</div></details>
      {rowsQuery.isLoading && !hasFilters ? <div className="streaming-rows-skeleton"><div /><div /><div /></div> : rows.length ? <div className="streaming-shelves">{rows.map(row => <StreamingCourseRow key={row.id} row={row} />)}</div> : <div className="empty-state"><Search size={28} /><h2>条件に合う講座が見つかりませんでした</h2><p>検索語や絞り込み条件を変更して、もう一度お試しください。</p><button className="button-secondary" onClick={reset}>条件をリセット</button></div>}
    </div></section>
  </SiteFrame>;
}
