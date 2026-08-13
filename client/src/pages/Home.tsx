import { ArrowRight, BadgeCheck, BookOpenText, CirclePlay, Compass, HeartPulse, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import CourseArtwork from "@/components/CourseArtwork";
import CourseCard from "@/components/CourseCard";
import SiteFrame from "@/components/SiteFrame";
import { formatDate, type CourseSummary } from "@/lib/course";
import { trpc } from "@/lib/trpc";

function SectionHeader({ label, title, text, href = "/catalog" }: { label: string; title: string; text: string; href?: string }) {
  return <div className="section-heading"><div><span className="eyebrow">{label}</span><h2>{title}</h2><p>{text}</p></div><Link href={href} className="text-link">すべて見る <ArrowRight size={16} /></Link></div>;
}

function CourseStrip({ courses }: { courses: CourseSummary[] }) {
  return <div className="course-grid">{courses.map(course => <CourseCard key={course.id} course={course} />)}</div>;
}

export default function Home() {
  const featuredQuery = trpc.catalog.featured.useQuery();
  const coursesQuery = trpc.catalog.list.useQuery({ sort: "newest" });
  const featured = featuredQuery.data;
  const courses = coursesQuery.data ?? [];
  const firstSteps = courses.slice(0, 4);
  const glpCourses = courses.filter(course => course.category.slug === "glp1-basics").slice(0, 3);
  const lifestyleCourses = courses.filter(course => course.category.slug === "food-lifestyle").slice(0, 3);
  const careCourses = courses.filter(course => ["care-prep", "metabolic-health"].includes(course.category.slug)).slice(0, 3);

  return <SiteFrame>
    <section className="hero">
      <div className="hero__aura hero__aura--one" /><div className="hero__aura hero__aura--two" />
      <div className="container hero__grid">
        <div className="hero__content">
          <div className="chip-row"><span className="chip chip--gold">注目の医療教育講座</span><span className="chip">無料プレビューあり</span></div>
          {featured ? <>
            <span className="eyebrow eyebrow--aqua">{featured.category.name} ・ {featured.durationMinutes}分</span>
            <h1>{featured.title}</h1>
            <p className="hero__summary">{featured.summary}</p>
            <div className="hero__byline"><span>{featured.doctor.name}</span><strong>月額¥980</strong><small>税込・全講座見放題</small></div>
            <div className="hero__actions"><Link href={`/courses/${featured.slug}`} className="button-primary"><CirclePlay size={18} />詳細・無料プレビュー</Link><Link href="/catalog" className="button-secondary"><Compass size={18} />講座を探す</Link></div>
            <p className="hero__disclaimer">本講座は一般向け教育情報です。個別診療、処方、効果保証を行うものではありません。</p>
          </> : <div className="hero__loading"><span className="eyebrow">MEDICAL EDUCATION</span><h1>医療情報を、<br />確かな理解へ。</h1><p>医師制作・監修の一般向け動画講座を準備しています。</p></div>}
        </div>
        {featured && <Link href={`/courses/${featured.slug}`} className="hero__art-link" aria-label={`${featured.title}の詳細へ`}><CourseArtwork theme={featured.thumbnailTheme} category={featured.category.name} title={featured.title} /><div className="hero__art-caption"><span>FEATURED COURSE</span><span>レビュー日 {formatDate(featured.reviewedAt)}</span></div></Link>}
      </div>
      <div className="container trust-row">
        <article><BadgeCheck size={21} /><div><strong>医師制作・監修</strong><span>制作医師、医学レビュー日、参考文献を明示</span></div></article>
        <article><ShieldCheck size={21} /><div><strong>一般向け医療教育</strong><span>診療・治療の指示と誤認させない安全設計</span></div></article>
        <article><BookOpenText size={21} /><div><strong>何度でも視聴</strong><span>加入中はマイページから繰り返し学習</span></div></article>
      </div>
    </section>

    <section className="section section--warm"><div className="container"><SectionHeader label="START HERE" title="初めての方へ" text="基礎から落ち着いて学べる講座" />{coursesQuery.isLoading ? <div className="card-skeletons" /> : <CourseStrip courses={firstSteps as CourseSummary[]} />}</div></section>

    <section className="section"><div className="container"><SectionHeader label="JUST ADDED" title="新着講座" text="医学レビュー日と公開日を明示しています" />{coursesQuery.isLoading ? <div className="card-skeletons" /> : <CourseStrip courses={courses.slice(0, 6) as CourseSummary[]} />}</div></section>

    <section className="section section--tinted"><div className="container"><SectionHeader label="LEARN THE BASICS" title="GLP-1を学ぶ" text="作用・適応・注意点を教育目的で理解する" href="/catalog?category=glp1-basics" /><CourseStrip courses={glpCourses as CourseSummary[]} /></div></section>

    <section className="section"><div className="container"><SectionHeader label="EVERYDAY HEALTH" title="食事・運動と生活習慣" text="無理のない継続を考える一般向け講座" href="/catalog?category=food-lifestyle" /><CourseStrip courses={lifestyleCourses as CourseSummary[]} /></div></section>

    <section className="section section--warm"><div className="container"><SectionHeader label="PREPARE FOR A VISIT" title="受診前に知っておきたいこと" text="医療機関での相談に備える" href="/catalog?category=care-prep" /><CourseStrip courses={careCourses as CourseSummary[]} /></div></section>

    <section className="preview-callout"><div className="container preview-callout__inner"><div><span className="eyebrow eyebrow--aqua">LEARN WITH CONFIDENCE</span><h2>まずは無料プレビューから</h2><p>ログイン前でも、各講座の概要と無料プレビューを確認できます。加入前に対象者、学習目標、参考文献、COIをご確認ください。</p></div><Link href="/catalog" className="button-primary">全講座を見る <ArrowRight size={18} /></Link></div><HeartPulse className="preview-callout__icon" aria-hidden="true" /></section>
  </SiteFrame>;
}
