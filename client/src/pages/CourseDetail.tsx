import React from "react";
import { AlertTriangle, ArrowLeft, BookOpen, Bookmark, Check, CheckCircle2, CirclePlay, Clock3, FileText, LockKeyhole, Play, ShieldCheck, UserRound } from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import CourseArtwork from "@/components/CourseArtwork";
import { InlineLearningPlayer } from "@/components/InlineLearningPlayer";
import SiteFrame from "@/components/SiteFrame";
import { formatDate, formatYen, splitText, type CourseDetail as CourseDetailType } from "@/lib/course";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const previewVideoUrl = "/manus-storage/medivista-academy-learning-preview_6ca26cf0.mp4";

function LoadingDetail() {
  return <SiteFrame><div className="detail-loading container"><div /><div /></div></SiteFrame>;
}

export default function CourseDetail() {
  const [, params] = useRoute<{ slug: string }>("/courses/:slug");
  const slug = params?.slug ?? "";
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const courseQuery = trpc.catalog.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const course = courseQuery.data as CourseDetailType | undefined;
  const actionsQuery = trpc.catalog.actions.useQuery({ courseId: course?.id ?? 0 }, { enabled: isAuthenticated && Boolean(course?.id) });
  const toggleWishlist = trpc.catalog.toggleWishlist.useMutation({
    onSuccess: result => { utils.catalog.actions.invalidate(); utils.library.mine.invalidate(); toast.success(result.wishlisted ? "マイリストに追加しました" : "マイリストから削除しました"); },
    onError: () => toast.error("マイリストを更新できませんでした。"),
  });
  const subscribe = trpc.subscription.createCheckout.useMutation({
    onSuccess: result => {
      if (result.alreadySubscribed) return toast.success("すでに加入済みです。すべての講座を視聴できます。");
      const checkoutWindow = window.open(result.url!, "_blank", "noopener,noreferrer");
      if (!checkoutWindow) window.location.assign(result.url!);
      toast.success("Stripeの安全な決済ページを新しいタブで開きました。");
    },
    onError: () => toast.error("決済ページを作成できませんでした。もう一度お試しください。"),
  });
  const progress = trpc.catalog.updateProgress.useMutation({ onSuccess: () => { utils.catalog.actions.invalidate(); utils.library.mine.invalidate(); toast.success("現在の視聴位置を保存しました。"); }, onError: () => toast.error("視聴位置を保存できませんでした。") });

  if (courseQuery.isLoading) return <LoadingDetail />;
  if (!course) return <SiteFrame><div className="empty-state page-empty"><BookOpen size={28} /><h1>講座が見つかりませんでした</h1><Link href="/catalog" className="button-primary">講座一覧へ戻る</Link></div></SiteFrame>;

  const actions = actionsQuery.data;
  const subscribed = actions?.subscribed ?? false;
  const monthlyPrice = actions?.monthlyPrice ?? 980;
  const learningPoints = splitText(course.learningPoints);
  const scrollToPlayer = () => document.getElementById("learning-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const handleWishlist = () => {
    if (!isAuthenticated) return startLogin();
    toggleWishlist.mutate({ courseId: course.id });
  };
  const handleSubscribe = () => {
    if (!isAuthenticated) return startLogin();
    subscribe.mutate();
  };

  return <SiteFrame>
    <section className="course-hero"><div className="container"><Link href="/catalog" className="back-link"><ArrowLeft size={16} />動画を探す</Link><div className="course-hero__grid"><div><div className="chip-row"><span className="chip chip--gold">{course.category.name}</span><span className="chip">一般向け医療教育</span></div><h1>{course.title}</h1><p className="course-hero__summary">{course.summary}</p><div className="detail-meta"><span><UserRound size={16} />{course.doctor.name}</span><span><Clock3 size={16} />{course.durationMinutes}分</span><span><FileText size={16} />医学レビュー {formatDate(course.reviewedAt)}</span></div><div className="hero__actions"><button className="button-primary" onClick={subscribed ? scrollToPlayer : handleSubscribe} disabled={subscribe.isPending}>{subscribed ? <><Play size={18} />ページ内で視聴する</> : <><LockKeyhole size={18} />{subscribe.isPending ? "決済ページを準備中…" : `月額${formatYen(monthlyPrice)}で加入`}</>}</button><button className={`button-secondary ${actions?.wishlisted ? "is-saved" : ""}`} onClick={handleWishlist}><Bookmark size={18} fill={actions?.wishlisted ? "currentColor" : "none"} />{actions?.wishlisted ? "マイリスト済み" : "マイリスト"}</button></div><p className="micro-copy">動画はページ内のプレーヤーで再生できます。加入中は再生位置を保存して、続きから学習できます。</p></div><button className="preview-art" onClick={scrollToPlayer} aria-label="ページ内の無料プレビューへ移動"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} /><span className="preview-art__play"><CirclePlay size={44} /></span><span className="preview-art__caption">{course.previewLabel}</span></button></div></div></section>
    <section className="course-body"><div className="container course-body__grid"><article className="course-main"><InlineLearningPlayer title={course.title} category={course.category.name} src={previewVideoUrl} initialPositionSeconds={actions?.progress?.lastPositionSeconds ?? 0} initialProgressPercent={actions?.progress?.progressPercent ?? 0} canSaveProgress={subscribed} isSavingProgress={progress.isPending} onSaveProgress={subscribed ? payload => progress.mutate({ courseId: course.id, progressPercent: payload.progressPercent, lastPositionSeconds: payload.positionSeconds }) : undefined} /><span className="eyebrow eyebrow--gold">COURSE OVERVIEW</span><h2>講座の全体像</h2><section className="course-summary-block" aria-labelledby="course-summary-title"><span className="course-summary-block__label">要約</span><h3 id="course-summary-title">この動画で扱うこと</h3><p>{course.summary}</p></section><div className="course-structured-grid"><section className="course-structured-card"><span className="course-structured-card__number">01</span><h3>この動画の要点</h3><p>{course.description}</p></section><section className="course-structured-card"><span className="course-structured-card__number">02</span><h3>対象となる方</h3><p>{course.intendedFor}</p></section><section className="course-structured-card course-structured-card--wide"><span className="course-structured-card__number">03</span><h3>視聴後に得られる知識</h3><ul>{learningPoints.map(point => <li key={point}><Check size={15} />{point}</li>)}</ul></section></div><section className="doctor-block"><div className="doctor-avatar">{course.doctor.initials}</div><div><span className="eyebrow">制作・監修医師</span><h2>{course.doctor.name}</h2><strong>{course.doctor.specialty} ／ {course.doctor.affiliation}</strong><p>{course.doctorProfile}</p></div></section><section className="course-documentation"><span className="eyebrow eyebrow--gold">TRANSPARENCY</span><h2>情報の透明性</h2><h3>利益相反（COI）</h3><p>{course.coiText}</p>{course.referenceLinks.length > 0 && <section className="course-reference-links" aria-labelledby="course-reference-links-title"><span className="course-reference-links__eyebrow">SOURCES FOR CONTEXT</span><h3 id="course-reference-links-title">根拠・補足のための参考URL</h3><p>内容をより詳しく確認したい方のために、公的機関・専門団体の情報ページを掲載しています。個別の診断・治療の判断には利用せず、疑問は医療者へご相談ください。</p><ol>{course.referenceLinks.map(link => <li key={link.id}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<span aria-hidden="true">↗</span></a></li>)}</ol></section>}</section></article><aside className="course-sidebar"><div className="purchase-card"><span>全講座見放題</span><strong>{formatYen(monthlyPrice)}<small>（税込）/ 月</small></strong><p>月額サブスクリプション</p><button className="button-primary button-primary--full" onClick={subscribed ? scrollToPlayer : handleSubscribe} disabled={subscribe.isPending}>{subscribed ? <><CirclePlay size={17} />ページ内で視聴する</> : <><Play size={17} />{subscribe.isPending ? "決済ページを準備中…" : `Stripeで月額${formatYen(monthlyPrice)}に加入`}</>}</button><ul><li><CheckCircle2 size={15} />加入中は全講座を何度でも視聴</li><li><CheckCircle2 size={15} />再生位置をマイページで確認</li><li><CheckCircle2 size={15} />請求・解約はStripeの安全なポータルで管理</li></ul></div><div className="medical-alert"><AlertTriangle size={18} /><div><strong>医療情報に関する重要事項</strong><p>本コンテンツは一般向け医療教育情報です。個別の診断、治療、処方、服薬変更、効果保証を行うものではありません。症状や治療については医療機関でご相談ください。</p></div></div><div className="transparency-card"><ShieldCheck size={18} /><div><strong>情報の透明性</strong><dl><dt>公開日</dt><dd>{formatDate(course.publishedAt)}</dd><dt>最終医学レビュー</dt><dd>{formatDate(course.reviewedAt)}</dd><dt>運営</dt><dd>glp1.diet</dd></dl></div></div></aside></div></section>
  </SiteFrame>;
}
