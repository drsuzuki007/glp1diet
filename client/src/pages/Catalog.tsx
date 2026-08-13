import { FilterX, Search, SlidersHorizontal } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import CourseCard from "@/components/CourseCard";
import SiteFrame from "@/components/SiteFrame";
import type { CourseSummary } from "@/lib/course";
import { trpc } from "@/lib/trpc";

type CatalogForm = {
  search: string;
  category: string;
  price: "" | "under1500" | "1500to3000" | "over3000";
  duration: "" | "under30" | "30to45" | "over45";
  doctor: string;
  published: "" | "month" | "quarter" | "year";
  sort: "newest" | "priceAsc" | "priceDesc" | "duration";
};

const emptyForm: CatalogForm = { search: "", category: "", price: "", duration: "", doctor: "", published: "", sort: "newest" };

function getFormFromSearch(value: string): CatalogForm {
  const params = new URLSearchParams(value);
  return { ...emptyForm, search: params.get("search") ?? "", category: params.get("category") ?? "" };
}

export default function Catalog() {
  const urlSearch = useSearch();
  const [filters, setFilters] = useState<CatalogForm>(() => getFormFromSearch(urlSearch));
  const filtersQuery = trpc.catalog.filters.useQuery();
  const courseQueryInput = useMemo(() => ({
    search: filters.search || undefined,
    category: filters.category || undefined,
    price: filters.price || undefined,
    duration: filters.duration || undefined,
    doctor: filters.doctor || undefined,
    published: filters.published || undefined,
    sort: filters.sort,
  }), [filters]);
  const coursesQuery = trpc.catalog.list.useQuery(courseQueryInput);

  useEffect(() => setFilters(getFormFromSearch(urlSearch)), [urlSearch]);

  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters(current => ({ ...current, [name]: value }));
  };

  const reset = () => setFilters(emptyForm);
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "sort" && value !== "");

  return <SiteFrame>
    <section className="catalog-hero"><div className="container"><span className="eyebrow eyebrow--gold">MEDICAL EDUCATION CATALOG</span><h1>動画を探す</h1><p>テーマ、価格、再生時間、制作医師から講座を絞り込めます。各講座は一般向け医療教育を目的としています。</p></div></section>
    <section className="catalog-content"><div className="container">
      <div className="filter-panel">
        <div className="filter-panel__top"><span className="filter-panel__title"><SlidersHorizontal size={18} />講座を絞り込む</span><span>目的に合う学びを、必要な条件から。</span></div>
        <label className="catalog-search"><Search size={19} /><input name="search" value={filters.search} onChange={update} placeholder="タイトル、講師名、テーマから検索" /></label>
        <div className="filter-grid">
          <label><span>カテゴリ</span><select name="category" value={filters.category} onChange={update}><option value="">すべてのカテゴリ</option>{filtersQuery.data?.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
          <label><span>価格</span><select name="price" value={filters.price} onChange={update}><option value="">すべての価格</option><option value="under1500">¥1,500未満</option><option value="1500to3000">¥1,500〜¥3,000</option><option value="over3000">¥3,000超</option></select></label>
          <label><span>再生時間</span><select name="duration" value={filters.duration} onChange={update}><option value="">すべての再生時間</option><option value="under30">30分未満</option><option value="30to45">30〜45分</option><option value="over45">45分超</option></select></label>
          <label><span>制作医師</span><select name="doctor" value={filters.doctor} onChange={update}><option value="">すべての制作医師</option>{filtersQuery.data?.doctors.map(doctor => <option key={doctor.slug} value={doctor.slug}>{doctor.name}</option>)}</select></label>
          <label><span>公開日</span><select name="published" value={filters.published} onChange={update}><option value="">すべての公開日</option><option value="month">過去1か月</option><option value="quarter">過去3か月</option><option value="year">過去1年</option></select></label>
          <label><span>並べ替え</span><select name="sort" value={filters.sort} onChange={update}><option value="newest">新着順</option><option value="priceAsc">価格が低い順</option><option value="priceDesc">価格が高い順</option><option value="duration">再生時間が長い順</option></select></label>
        </div>
      </div>
      <div className="catalog-results-bar"><p><strong>{coursesQuery.data?.length ?? "—"}</strong> 件の講座</p>{hasFilters && <button onClick={reset} className="reset-button"><FilterX size={15} />条件をリセット</button>}</div>
      {coursesQuery.isLoading ? <div className="catalog-grid"><div className="catalog-card-skeleton" /><div className="catalog-card-skeleton" /><div className="catalog-card-skeleton" /><div className="catalog-card-skeleton" /></div> : coursesQuery.data?.length ? <div className="catalog-grid">{coursesQuery.data.map(course => <CourseCard key={course.id} course={course as CourseSummary} />)}</div> : <div className="empty-state"><Search size={28} /><h2>条件に合う講座が見つかりませんでした</h2><p>検索語やフィルター条件を変更して、もう一度お試しください。</p><button className="button-secondary" onClick={reset}>条件をリセット</button></div>}
    </div></section>
  </SiteFrame>;
}
