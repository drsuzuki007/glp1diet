import { Bookmark, CirclePlay, Clock3, Crown, GraduationCap, LibraryBig, LockKeyhole, PlayCircle } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import CourseArtwork from "@/components/CourseArtwork";
import SiteFrame from "@/components/SiteFrame";
import { formatDate, formatYen, type CourseSummary } from "@/lib/course";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type LibraryCourse = CourseSummary & { savedAt?: Date; progressPercent?: number | null; completed?: boolean | null };

const tabs = [
  { id: "wishlist", label: "マイリスト", Icon: Bookmark },
  { id: "progress", label: "視聴進捗", Icon: CirclePlay },
];

function LibraryItem({ course, type }: { course: LibraryCourse; type: "wishlist" | "progress" }) {
  const progress = course.progressPercent ?? 0;
  return <Link href={`/courses/${course.slug}`} className="library-item"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact /><div className="library-item__main"><span className="eyebrow eyebrow--aqua">{course.category.name}</span><h3>{course.title}</h3><p>{course.doctor.name} ・ {course.durationMinutes}分</p>{type === "progress" && <><div className="progress-line progress-line--library"><span style={{ width: `${progress}%` }} /></div><small>{progress}% 視聴済み {course.completed ? "・完了" : ""}</small></>}</div><div className="library-item__side"><strong>{type === "progress" ? `${progress}%` : "保存済み"}</strong><span>{type === "progress" ? "続きから視聴" : "詳細を見る"}</span></div></Link>;
}

function AvailableCourse({ course, progressPercent }: { course: CourseSummary; progressPercent?: number | null }) {
  const progress = progressPercent ?? 0;
  return <Link href={`/courses/${course.slug}`} className="available-course-card"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact /><div className="available-course-card__body"><span className="eyebrow eyebrow--aqua">視聴可能</span><h3>{course.title}</h3><p>{course.doctor.name} ・ {course.durationMinutes}分</p>{progress > 0 ? <><div className="progress-line progress-line--library"><span style={{ width: `${progress}%` }} /></div><small>{progress}% 視聴済み</small></> : <small>今すぐ視聴を開始できます</small>}</div><span className="available-course-card__action">視聴する</span></Link>;
}

export default function MyPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();
  const queryParams = new URLSearchParams(search);
  const tabFromUrl = queryParams.get("tab");
  const activeTab = tabs.some(tab => tab.id === tabFromUrl) ? tabFromUrl! : "wishlist";
  const billingUpdated = queryParams.get("billing") === "updated" || queryParams.get("checkout") === "success";
  const dashboardPreview = import.meta.env.DEV ? queryParams.get("preview") : null;
  const libraryQuery = trpc.library.mine.useQuery(undefined, { enabled: isAuthenticated });
  const refreshSubscription = trpc.subscription.refresh.useMutation({ onSuccess: () => { libraryQuery.refetch(); } });
  const checkout = trpc.subscription.createCheckout.useMutation({
    onSuccess: result => {
      if (result.alreadySubscribed) return toast.success("すでに加入済みです。");
      const checkoutWindow = window.open(result.url!, "_blank", "noopener,noreferrer");
      if (!checkoutWindow) window.location.assign(result.url!);
      toast.success("Stripeの安全な決済ページを新しいタブで開きました。");
    },
    onError: () => toast.error("決済ページを作成できませんでした。"),
  });
  const portal = trpc.subscription.createBillingPortal.useMutation({
    onSuccess: result => {
      const portalWindow = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!portalWindow) window.location.assign(result.url);
    },
    onError: () => toast.error("請求ポータルを開けませんでした。"),
  });

  const library = libraryQuery.data;
  const wishlistCourses = (library?.wishlist ?? []) as LibraryCourse[];
  const progressCourses = (library?.progress ?? []) as LibraryCourse[];
  const availableCourses = (library?.availableCourses ?? []) as CourseSummary[];
  const progressByCourseId = new Map(progressCourses.map(course => [course.id, course.progressPercent]));
  const shownCourses = activeTab === "wishlist" ? wishlistCourses : progressCourses;
  const subscribed = dashboardPreview === "unsubscribed" ? false : library?.subscribed ?? false;
  const monthlyPrice = library?.monthlyPrice ?? 980;
  const cancellationScheduled = dashboardPreview === "active" ? false : library?.subscription?.cancelAtPeriodEnd ?? false;
  const subscriptionEnd = library?.subscription?.currentPeriodEnd ?? null;
  const billingLabel = cancellationScheduled ? "視聴可能期限" : "次回請求日";
  const billingDate = subscriptionEnd ? formatDate(subscriptionEnd) : "Stripeで確認中";

  useEffect(() => {
    if (isAuthenticated && billingUpdated) refreshSubscription.mutate();
  }, [billingUpdated, isAuthenticated]);

  if (loading) return <SiteFrame><div className="page-loading container"><span /></div></SiteFrame>;
  if (!isAuthenticated) return <SiteFrame><section className="auth-prompt"><div className="auth-prompt__icon"><LockKeyhole size={28} /></div><span className="eyebrow eyebrow--gold">MEMBER LIBRARY</span><h1>マイページにはログインが必要です</h1><p>サブスクリプション状態、視聴進捗、マイリストを安全に管理します。</p><button className="button-primary" onClick={() => startLogin()}>Manus OAuthでログイン</button></section></SiteFrame>;

  return <SiteFrame><section className="my-page"><div className="container"><div className="my-page__heading"><div><span className="eyebrow eyebrow--gold">MY LEARNING LIBRARY</span><h1>マイページ</h1><p>{user?.name ?? "受講者"}さんの学びとご契約を、ここから確認できます。</p></div><div className="my-page__badge"><GraduationCap size={20} /><span>一般向け医療教育</span></div></div><section className={`subscription-banner ${subscribed ? "subscription-banner--active" : ""}`}><div><span className="eyebrow">{subscribed ? "ACTIVE SUBSCRIPTION" : "ALL ACCESS MEMBERSHIP"}</span><h2>{subscribed ? cancellationScheduled ? "解約予定のサブスクリプション" : "全講座を視聴できます" : `月額${formatYen(monthlyPrice)}で全講座見放題`}</h2><p>{subscribed ? cancellationScheduled && subscriptionEnd ? `解約予定日：${formatDate(subscriptionEnd)}。この日までは全講座を視聴できます。請求・解約の変更はStripeの請求ポータルから管理できます。` : "加入中のため、すべての講座をいつでも視聴できます。請求と解約はStripeの請求ポータルから管理できます。" : "GLP-1、食事、運動、検査値の全講座を、月額サブスクリプションでご利用いただけます。"}</p></div>{subscribed ? <div className="subscription-banner__actions"><span className="subscription-banner__status"><Crown size={17} />{cancellationScheduled ? "解約予定" : "加入中"}</span><button className="button-secondary" onClick={() => portal.mutate()} disabled={portal.isPending}>{portal.isPending ? "ポータルを準備中…" : "請求・解約を管理"}</button></div> : <button className="button-primary" onClick={() => checkout.mutate()} disabled={checkout.isPending}><PlayCircle size={17} />{checkout.isPending ? "決済ページを準備中…" : "Stripeで加入する"}</button>}</section><section className="subscription-dashboard" aria-label="契約と視聴状況"><div className="subscription-dashboard__heading"><div><span className="eyebrow eyebrow--gold">SUBSCRIPTION AT A GLANCE</span><h2>契約・視聴状況</h2></div><p>ご契約と、今すぐ視聴できる講座をまとめて確認できます。</p></div><div className="subscription-metrics"><article><span>現在の契約状態</span><strong>{subscribed ? cancellationScheduled ? "解約予定" : "加入中" : "未加入"}</strong><small>{subscribed ? "全講座見放題" : "視聴には加入が必要です"}</small></article><article><span>{billingLabel}</span><strong>{subscribed ? billingDate : "—"}</strong><small>{cancellationScheduled ? "この日までは視聴可能" : subscribed ? `毎月${formatYen(monthlyPrice)}（税込）` : "Stripeで安全に決済"}</small></article><article><span>視聴可能な講座</span><strong>{subscribed ? `${availableCourses.length}講座` : "0講座"}</strong><small>{subscribed ? "追加料金なしで視聴できます" : "全講座が対象です"}</small></article></div></section>{subscribed && <section className="available-courses-section"><div className="available-courses-section__heading"><div><span className="eyebrow eyebrow--gold">YOUR ALL-ACCESS LIBRARY</span><h2>視聴可能な動画</h2><p>加入中のため、以下のすべての講座をいつでも視聴できます。</p></div><Link href="/catalog" className="text-link">講座一覧を開く <Clock3 size={16} /></Link></div>{libraryQuery.isLoading ? <div className="library-skeleton" /> : <div className="available-courses-grid">{availableCourses.map(course => <AvailableCourse key={course.id} course={course} progressPercent={progressByCourseId.get(course.id)} />)}</div>}</section>}<div className="library-tabs" role="tablist">{tabs.map(({ id, label, Icon }) => <button key={id} role="tab" aria-selected={activeTab === id} className={activeTab === id ? "is-active" : ""} onClick={() => navigate(`/mypage?tab=${id}`)}><Icon size={17} />{label}<span>{id === "wishlist" ? wishlistCourses.length : progressCourses.length}</span></button>)}</div><section className="library-panel"><div className="library-panel__heading"><div><h2>{tabs.find(tab => tab.id === activeTab)?.label}</h2><p>{activeTab === "wishlist" ? "気になる講座を保存しておけます。" : "途中まで視聴した講座を続きから再開できます。"}</p></div></div>{libraryQuery.isLoading ? <div className="library-skeleton" /> : shownCourses.length ? <div className="library-list">{shownCourses.map(course => <LibraryItem key={course.id} course={course} type={activeTab as "wishlist" | "progress"} />)}</div> : <div className="library-empty"><LibraryBig size={26} /><h3>{activeTab === "wishlist" ? "マイリストはまだ空です" : "視聴を開始した講座はありません"}</h3><p>{activeTab === "wishlist" ? "気になる講座を見つけたら、詳細ページから保存できます。" : subscribed ? "全講座から、興味のあるテーマを選んで視聴を始めましょう。" : "月額サブスクリプションに加入すると、すべての講座を視聴できます。"}</p><Link href="/catalog" className="button-secondary"><Clock3 size={17} />講座を探す</Link></div>}</section></div></section></SiteFrame>;
}
