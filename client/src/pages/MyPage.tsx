import { Bookmark, CirclePlay, Clock3, Crown, GraduationCap, LibraryBig, LockKeyhole, PlayCircle } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import CourseArtwork from "@/components/CourseArtwork";
import SiteFrame from "@/components/SiteFrame";
import { formatDate, formatYen, type CourseSummary } from "@/lib/course";
import { trpc } from "@/lib/trpc";
import type { MonthlyLearningMetric } from "@shared/learningReport";
import { findLearningGoals, learningGoals, type LearningGoalValue } from "@shared/learningGoals";
import { toast } from "sonner";

type LibraryCourse = CourseSummary & { savedAt?: Date; progressPercent?: number | null; completed?: boolean | null };
type Recommendation = { course: CourseSummary; reason: string; kind: "continue" | "topic" | "explore" };

const tabs = [
  { id: "wishlist", label: "マイリスト", Icon: Bookmark },
  { id: "progress", label: "視聴進捗", Icon: CirclePlay },
];

function minutesLabel(minutes: number) {
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)}分`;
}

function LibraryItem({ course, type }: { course: LibraryCourse; type: "wishlist" | "progress" }) {
  const progress = course.progressPercent ?? 0;
  return <Link href={`/courses/${course.slug}`} className="library-item"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact /><div className="library-item__main"><span className="eyebrow eyebrow--aqua">{course.category.name}</span><h3>{course.title}</h3><p>{course.doctor.name} ・ {course.durationMinutes}分</p>{type === "progress" && <><div className="progress-line progress-line--library"><span style={{ width: `${progress}%` }} /></div><small>{progress}% 視聴済み {course.completed ? "・完了" : ""}</small></>}</div><div className="library-item__side"><strong>{type === "progress" ? `${progress}%` : "保存済み"}</strong><span>{type === "progress" ? "続きから視聴" : "詳細を見る"}</span></div></Link>;
}

function AvailableCourse({ course, progressPercent }: { course: CourseSummary; progressPercent?: number | null }) {
  const progress = progressPercent ?? 0;
  return <Link href={`/courses/${course.slug}`} className="available-course-card"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact /><div className="available-course-card__body"><span className="eyebrow eyebrow--aqua">視聴可能</span><h3>{course.title}</h3><p>{course.doctor.name} ・ {course.durationMinutes}分</p>{progress > 0 ? <><div className="progress-line progress-line--library"><span style={{ width: `${progress}%` }} /></div><small>{progress}% 視聴済み</small></> : <small>今すぐ視聴を開始できます</small>}</div><span className="available-course-card__action">視聴する</span></Link>;
}

function LearningReport({ monthly }: { monthly: MonthlyLearningMetric[] }) {
  const current = monthly.at(-1);
  const maxMinutes = Math.max(...monthly.map(item => item.watchedMinutes), 1);
  const totalMinutes = monthly.reduce((sum, item) => sum + item.watchedMinutes, 0);
  const totalCompleted = monthly.reduce((sum, item) => sum + item.completedCount, 0);
  const hasActivity = totalMinutes > 0 || totalCompleted > 0;
  const encouragement = !hasActivity ? "最初の視聴位置を保存すると、ここに学びの軌跡が記録されます。" : (current?.watchedMinutes ?? 0) > 0 ? `今月は${minutesLabel(current?.watchedMinutes ?? 0)}の学習を積み重ねています。` : "次の視聴で、今月の学習グラフを育てていきましょう。";
  return <><section className="learning-report" aria-label="月ごとの学習レポート"><div className="learning-report__heading"><div><span className="eyebrow eyebrow--gold">YOUR LEARNING RHYTHM</span><h2>学習レポート</h2><p>{encouragement}</p></div><div className="learning-report__totals"><span>直近6か月</span><strong>{minutesLabel(totalMinutes)}</strong><small>完了 {totalCompleted}講座</small></div></div><div className="learning-report__stats"><article><span>今月の学習時間</span><strong>{minutesLabel(current?.watchedMinutes ?? 0)}</strong></article><article><span>今月の視聴完了</span><strong>{current?.completedCount ?? 0}講座</strong></article><article><span>学習継続</span><strong>{hasActivity ? "記録中" : "これから"}</strong></article></div><div className="learning-chart" role="img" aria-label="直近6か月の学習時間の棒グラフ">{monthly.map(item => <div key={item.key} className="learning-chart__column"><div className="learning-chart__value">{item.watchedMinutes > 0 ? minutesLabel(item.watchedMinutes) : "—"}</div><div className="learning-chart__track"><span style={{ height: `${Math.max(item.watchedMinutes > 0 ? 8 : 0, (item.watchedMinutes / maxMinutes) * 100)}%` }} /></div><strong>{item.label}</strong><small>{item.completedCount > 0 ? `完了 ${item.completedCount}` : ""}</small></div>)}</div><p className="learning-report__note">学習時間は、視聴位置を保存した実際の再生時間に基づいて集計されます。</p></section><LearningGoalSettings /></>;
}

function LearningGoalSettings() {
  const utils = trpc.useUtils();
  const goalQuery = trpc.learningGoal.mine.useQuery();
  const refreshGoals = () => { utils.learningGoal.mine.invalidate(); utils.library.mine.invalidate(); };
  const addGoal = trpc.learningGoal.add.useMutation({ onSuccess: () => { refreshGoals(); toast.success("学習目標を追加しました。おすすめを見直しています。"); }, onError: () => toast.error("学習目標を保存できませんでした。") });
  const removeGoal = trpc.learningGoal.remove.useMutation({ onSuccess: () => { refreshGoals(); toast.success("学習目標を解除しました。おすすめを見直しています。"); }, onError: () => toast.error("学習目標を更新できませんでした。") });
  const activeGoals = findLearningGoals(goalQuery.data as LearningGoalValue[] | null | undefined);
  const activeGoalValues = new Set(activeGoals.map(goal => goal.value));
  const changing = addGoal.isPending || removeGoal.isPending;
  return <section className="learning-goal-panel" aria-label="学習目標の設定"><div className="learning-goal-panel__heading"><div><span className="eyebrow eyebrow--gold">YOUR LEARNING GOALS</span><h2>いま学びたいこと</h2><p>複数の目標を選ぶと、各テーマに沿った未視聴講座を優先して提案します。</p></div>{activeGoals.length > 0 && <span className="learning-goal-panel__current">設定中：{activeGoals.map(goal => goal.label).join("・")}</span>}</div><div className="learning-goal-options">{learningGoals.map(goal => { const active = activeGoalValues.has(goal.value); return <button key={goal.value} type="button" className={active ? "is-active" : ""} onClick={() => active ? removeGoal.mutate(goal.value) : addGoal.mutate(goal.value)} disabled={changing} aria-pressed={active}><strong>{goal.label}</strong><span>{goal.description}</span></button>; })}</div><p className="learning-goal-panel__note">複数選択できます。学習目標は教育コンテンツの表示順を調整するための設定であり、診断や治療方針を示すものではありません。</p></section>;
}

function RecommendationPanel({ recommendations }: { recommendations: Recommendation[] }) {
  const labels = { continue: "続きから学ぶ", topic: "目標に沿って学ぶ", explore: "新しいテーマ" } as const;
  return <>{recommendations.length > 0 && <section className="recommendation-panel" aria-label="あなたへのおすすめ講座"><div className="recommendation-panel__heading"><div><span className="eyebrow eyebrow--gold">PERSONALIZED NEXT STEPS</span><h2>次に視聴するとよい講座</h2><p>学習目標、視聴履歴、完了講座の傾向から、まだ完了していない講座を提案しています。</p></div><span className="recommendation-panel__count">{recommendations.length}件の提案</span></div><div className="recommendation-grid">{recommendations.map(({ course, reason, kind }) => <Link key={course.id} href={`/courses/${course.slug}`} className="recommendation-card"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} compact /><div className="recommendation-card__body"><span className="recommendation-card__tag">{labels[kind]}</span><h3>{course.title}</h3><p className="recommendation-card__reason">{reason}</p><div className="recommendation-card__meta"><span>{course.category.name}</span><span>{course.durationMinutes}分</span><strong>視聴する</strong></div></div></Link>)}</div><p className="recommendation-panel__note">おすすめはご自身の保存済み視聴データと設定した学習目標だけを使用し、医療上の個別判断や診療の提案は行いません。</p></section>}</>;
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
  const checkout = trpc.subscription.createCheckout.useMutation({ onSuccess: result => { if (result.alreadySubscribed) return toast.success("すでに加入済みです。"); const checkoutWindow = window.open(result.url!, "_blank", "noopener,noreferrer"); if (!checkoutWindow) window.location.assign(result.url!); toast.success("Stripeの安全な決済ページを新しいタブで開きました。"); }, onError: () => toast.error("決済ページを作成できませんでした。") });
  const portal = trpc.subscription.createBillingPortal.useMutation({ onSuccess: result => { const portalWindow = window.open(result.url, "_blank", "noopener,noreferrer"); if (!portalWindow) window.location.assign(result.url); }, onError: () => toast.error("請求ポータルを開けませんでした。") });

  const library = libraryQuery.data;
  const wishlistCourses = (library?.wishlist ?? []) as LibraryCourse[];
  const progressCourses = (library?.progress ?? []) as LibraryCourse[];
  const availableCourses = (library?.availableCourses ?? []) as CourseSummary[];
  const recommendations = (library?.recommendations ?? []) as Recommendation[];
  const monthlyLearning = (library?.learningReport ?? []) as MonthlyLearningMetric[];
  const progressByCourseId = new Map(progressCourses.map(course => [course.id, course.progressPercent]));
  const shownCourses = activeTab === "wishlist" ? wishlistCourses : progressCourses;
  const subscribed = dashboardPreview === "unsubscribed" ? false : library?.subscribed ?? false;
  const monthlyPrice = library?.monthlyPrice ?? 980;
  const cancellationScheduled = dashboardPreview === "active" ? false : library?.subscription?.cancelAtPeriodEnd ?? false;
  const subscriptionEnd = library?.subscription?.currentPeriodEnd ?? null;
  const billingLabel = cancellationScheduled ? "視聴可能期限" : "次回請求日";
  const billingDate = subscriptionEnd ? formatDate(subscriptionEnd) : "Stripeで確認中";

  useEffect(() => { if (isAuthenticated && billingUpdated) refreshSubscription.mutate(); }, [billingUpdated, isAuthenticated]);

  if (loading) return <SiteFrame><div className="page-loading container"><span /></div></SiteFrame>;
  if (!isAuthenticated) return <SiteFrame><section className="auth-prompt"><div className="auth-prompt__icon"><LockKeyhole size={28} /></div><span className="eyebrow eyebrow--gold">MEMBER LIBRARY</span><h1>マイページにはログインが必要です</h1><p>サブスクリプション状態、視聴進捗、マイリストを安全に管理します。</p><button className="button-primary" onClick={() => startLogin()}>Manus OAuthでログイン</button></section></SiteFrame>;

  return <SiteFrame><section className="my-page"><div className="container"><div className="my-page__heading"><div><span className="eyebrow eyebrow--gold">MY LEARNING LIBRARY</span><h1>マイページ</h1><p>{user?.name ?? "受講者"}さんの学びとご契約を、ここから確認できます。</p></div><div className="my-page__badge"><GraduationCap size={20} /><span>一般向け医療教育</span></div></div><section className={`subscription-banner ${subscribed ? "subscription-banner--active" : ""}`}><div><span className="eyebrow">{subscribed ? "ACTIVE SUBSCRIPTION" : "ALL ACCESS MEMBERSHIP"}</span><h2>{subscribed ? cancellationScheduled ? "解約予定のサブスクリプション" : "全講座を視聴できます" : `月額${formatYen(monthlyPrice)}で全講座見放題`}</h2><p>{subscribed ? cancellationScheduled && subscriptionEnd ? `解約予定日：${formatDate(subscriptionEnd)}。この日までは全講座を視聴できます。請求・解約の変更はStripeの請求ポータルから管理できます。` : "加入中のため、すべての講座をいつでも視聴できます。請求と解約はStripeの請求ポータルから管理できます。" : "GLP-1、食事、運動、検査値の全講座を、月額サブスクリプションでご利用いただけます。"}</p></div>{subscribed ? <div className="subscription-banner__actions"><span className="subscription-banner__status"><Crown size={17} />{cancellationScheduled ? "解約予定" : "加入中"}</span><button className="button-secondary" onClick={() => portal.mutate()} disabled={portal.isPending}>{portal.isPending ? "ポータルを準備中…" : "請求・解約を管理"}</button></div> : <button className="button-primary" onClick={() => checkout.mutate()} disabled={checkout.isPending}><PlayCircle size={17} />{checkout.isPending ? "決済ページを準備中…" : "Stripeで加入する"}</button>}</section><section className="subscription-dashboard" aria-label="契約と視聴状況"><div className="subscription-dashboard__heading"><div><span className="eyebrow eyebrow--gold">SUBSCRIPTION AT A GLANCE</span><h2>契約・視聴状況</h2></div><p>ご契約と、今すぐ視聴できる講座をまとめて確認できます。</p></div><div className="subscription-metrics"><article><span>現在の契約状態</span><strong>{subscribed ? cancellationScheduled ? "解約予定" : "加入中" : "未加入"}</strong><small>{subscribed ? "全講座見放題" : "視聴には加入が必要です"}</small></article><article><span>{billingLabel}</span><strong>{subscribed ? billingDate : "—"}</strong><small>{cancellationScheduled ? "この日までは視聴可能" : subscribed ? `毎月${formatYen(monthlyPrice)}（税込）` : "Stripeで安全に決済"}</small></article><article><span>視聴可能な講座</span><strong>{subscribed ? `${availableCourses.length}講座` : "0講座"}</strong><small>{subscribed ? "追加料金なしで視聴できます" : "全講座が対象です"}</small></article></div></section>{subscribed && <section className="available-courses-section"><div className="available-courses-section__heading"><div><span className="eyebrow eyebrow--gold">YOUR ALL-ACCESS LIBRARY</span><h2>視聴可能な動画</h2><p>加入中のため、以下のすべての講座をいつでも視聴できます。</p></div><Link href="/catalog" className="text-link">講座一覧を開く <Clock3 size={16} /></Link></div>{libraryQuery.isLoading ? <div className="library-skeleton" /> : <div className="available-courses-grid">{availableCourses.map(course => <AvailableCourse key={course.id} course={course} progressPercent={progressByCourseId.get(course.id)} />)}</div>}</section>}<LearningReport monthly={monthlyLearning} />{subscribed && <RecommendationPanel recommendations={recommendations} />}<div className="library-tabs" role="tablist">{tabs.map(({ id, label, Icon }) => <button key={id} role="tab" aria-selected={activeTab === id} className={activeTab === id ? "is-active" : ""} onClick={() => navigate(`/mypage?tab=${id}`)}><Icon size={17} />{label}<span>{id === "wishlist" ? wishlistCourses.length : progressCourses.length}</span></button>)}</div><section className="library-panel"><div className="library-panel__heading"><div><h2>{tabs.find(tab => tab.id === activeTab)?.label}</h2><p>{activeTab === "wishlist" ? "気になる講座を保存しておけます。" : "途中まで視聴した講座を続きから再開できます。"}</p></div></div>{libraryQuery.isLoading ? <div className="library-skeleton" /> : shownCourses.length ? <div className="library-list">{shownCourses.map(course => <LibraryItem key={course.id} course={course} type={activeTab as "wishlist" | "progress"} />)}</div> : <div className="library-empty"><LibraryBig size={26} /><h3>{activeTab === "wishlist" ? "マイリストはまだ空です" : "視聴を開始した講座はありません"}</h3><p>{activeTab === "wishlist" ? "気になる講座を見つけたら、詳細ページから保存できます。" : subscribed ? "全講座から、興味のあるテーマを選んで視聴を始めましょう。" : "月額サブスクリプションに加入すると、すべての講座を視聴できます。"}</p><Link href="/catalog" className="button-secondary"><Clock3 size={17} />講座を探す</Link></div>}</section></div></section></SiteFrame>;
}
