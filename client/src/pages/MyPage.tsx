import { Bookmark, CirclePlay, Clock3, GraduationCap, LibraryBig, LockKeyhole, ReceiptText } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import CourseArtwork from "@/components/CourseArtwork";
import SiteFrame from "@/components/SiteFrame";
import { formatDate, formatYen, type CourseSummary } from "@/lib/course";
import { trpc } from "@/lib/trpc";

type LibraryCourse = CourseSummary & { savedAt?: Date; purchasedAt?: Date; priceAtPurchase?: number; progressPercent?: number | null; completed?: boolean | null };

const tabs = [
  { id: "wishlist", label: "マイリスト", Icon: Bookmark },
  { id: "purchases", label: "購入履歴", Icon: ReceiptText },
  { id: "progress", label: "視聴進捗", Icon: CirclePlay },
];

function LibraryItem({ course, type }: { course: LibraryCourse; type: "wishlist" | "purchases" | "progress" }) {
  const progress = course.progressPercent ?? 0;
  return <Link href={`/courses/${course.slug}`} className="library-item"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact /><div className="library-item__main"><span className="eyebrow eyebrow--aqua">{course.category.name}</span><h3>{course.title}</h3><p>{course.doctor.name} ・ {course.durationMinutes}分</p>{type === "progress" && <><div className="progress-line progress-line--library"><span style={{ width: `${progress}%` }} /></div><small>{progress}% 視聴済み {course.completed ? "・完了" : ""}</small></>}{type === "purchases" && <small>購入日 {course.purchasedAt ? formatDate(course.purchasedAt) : "—"}</small>}{type === "wishlist" && <small>保存日 {course.savedAt ? formatDate(course.savedAt) : "—"}</small>}</div><div className="library-item__side">{type === "purchases" ? <><strong>{formatYen(course.priceAtPurchase ?? course.price)}</strong><span>視聴する</span></> : type === "progress" ? <><strong>{progress}%</strong><span>続きから視聴</span></> : <span>詳細を見る</span>}</div></Link>;
}

export default function MyPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();
  const tabFromUrl = new URLSearchParams(search).get("tab");
  const activeTab = tabs.some(tab => tab.id === tabFromUrl) ? tabFromUrl! : "wishlist";
  const libraryQuery = trpc.library.mine.useQuery(undefined, { enabled: isAuthenticated });
  const library = libraryQuery.data;
  const purchaseCourses = (library?.purchases ?? []) as LibraryCourse[];
  const wishlistCourses = (library?.wishlist ?? []) as LibraryCourse[];
  const progressCourses = purchaseCourses.filter(course => (course.progressPercent ?? 0) > 0);
  const shownCourses = activeTab === "wishlist" ? wishlistCourses : activeTab === "purchases" ? purchaseCourses : progressCourses;

  if (loading) return <SiteFrame><div className="page-loading container"><span /></div></SiteFrame>;
  if (!isAuthenticated) return <SiteFrame><section className="auth-prompt"><div className="auth-prompt__icon"><LockKeyhole size={28} /></div><span className="eyebrow eyebrow--gold">MEMBER LIBRARY</span><h1>マイページにはログインが必要です</h1><p>購入済み動画、視聴進捗、マイリストを安全に管理します。</p><button className="button-primary" onClick={() => startLogin()}>Manus OAuthでログイン</button></section></SiteFrame>;

  return <SiteFrame><section className="my-page"><div className="container"><div className="my-page__heading"><div><span className="eyebrow eyebrow--gold">MY LEARNING LIBRARY</span><h1>マイページ</h1><p>{user?.name ?? "受講者"}さんの学びを、ここから続けられます。</p></div><div className="my-page__badge"><GraduationCap size={20} /><span>一般向け医療教育</span></div></div><div className="library-tabs" role="tablist">{tabs.map(({ id, label, Icon }) => <button key={id} role="tab" aria-selected={activeTab === id} className={activeTab === id ? "is-active" : ""} onClick={() => navigate(`/mypage?tab=${id}`)}><Icon size={17} />{label}<span>{id === "wishlist" ? wishlistCourses.length : id === "purchases" ? purchaseCourses.length : progressCourses.length}</span></button>)}</div><section className="library-panel"><div className="library-panel__heading"><div><h2>{tabs.find(tab => tab.id === activeTab)?.label}</h2><p>{activeTab === "wishlist" ? "気になる講座を保存しておけます。" : activeTab === "purchases" ? "デモ購入した講座を何度でも視聴できます。" : "途中まで視聴した講座を続きから再開できます。"}</p></div></div>{libraryQuery.isLoading ? <div className="library-skeleton" /> : shownCourses.length ? <div className="library-list">{shownCourses.map(course => <LibraryItem key={course.id} course={course} type={activeTab as "wishlist" | "purchases" | "progress"} />)}</div> : <div className="library-empty"><LibraryBig size={26} /><h3>{activeTab === "wishlist" ? "マイリストはまだ空です" : activeTab === "purchases" ? "購入済みの講座はありません" : "視聴を開始した講座はありません"}</h3><p>{activeTab === "wishlist" ? "気になる講座を見つけたら、詳細ページから保存できます。" : "講座一覧から、興味のあるテーマを探してみましょう。"}</p><Link href="/catalog" className="button-secondary"><Clock3 size={17} />講座を探す</Link></div>}</section></div></section></SiteFrame>;
}
