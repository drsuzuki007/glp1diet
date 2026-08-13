import { AlertTriangle, ArrowLeft, BookOpen, Bookmark, Check, CheckCircle2, CirclePlay, Clock3, FileText, HeartPulse, LockKeyhole, Play, ShieldCheck, UserRound, X } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import CourseArtwork from "@/components/CourseArtwork";
import SiteFrame from "@/components/SiteFrame";
import { formatDate, formatYen, splitText, type CourseDetail as CourseDetailType } from "@/lib/course";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { calculateVideoProgress, progressForSaving } from "../../../shared/learning";

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const playerVideoRef = useRef<HTMLVideoElement>(null);
  const toggleWishlist = trpc.catalog.toggleWishlist.useMutation({
    onSuccess: result => { utils.catalog.actions.invalidate(); toast.success(result.wishlisted ? "マイリストに追加しました" : "マイリストから削除しました"); },
    onError: () => toast.error("マイリストを更新できませんでした。"),
  });
  const purchase = trpc.catalog.demoPurchase.useMutation({
    onSuccess: result => { utils.catalog.actions.invalidate(); setPurchaseOpen(false); toast.success(result.alreadyPurchased ? "すでに購入済みです" : "デモ購入が完了しました。視聴を開始できます。"); },
    onError: () => toast.error("デモ購入を完了できませんでした。もう一度お試しください。"),
  });
  const progress = trpc.catalog.updateProgress.useMutation({ onSuccess: () => { utils.catalog.actions.invalidate(); utils.library.mine.invalidate(); } });

  if (courseQuery.isLoading) return <LoadingDetail />;
  if (!course) return <SiteFrame><div className="empty-state page-empty"><BookOpen size={28} /><h1>講座が見つかりませんでした</h1><Link href="/catalog" className="button-primary">講座一覧へ戻る</Link></div></SiteFrame>;

  const actions = actionsQuery.data;
  const bought = actions?.purchased;
  const handleWishlist = () => {
    if (!isAuthenticated) return startLogin();
    toggleWishlist.mutate({ courseId: course.id });
  };
  const handlePurchase = () => {
    if (!isAuthenticated) return startLogin();
    setPurchaseOpen(true);
  };
  const saveProgress = () => {
    const video = playerVideoRef.current;
    const nextProgress = progressForSaving(video?.currentTime ?? 0, video?.duration ?? 0, demoProgress);
    setDemoProgress(nextProgress);
    progress.mutate({ courseId: course.id, progressPercent: nextProgress, lastPositionSeconds: Math.round(video?.currentTime ?? 0) });
  };

  return <SiteFrame>
    <section className="course-hero"><div className="container"><Link href="/catalog" className="back-link"><ArrowLeft size={16} />動画を探す</Link><div className="course-hero__grid"><div><div className="chip-row"><span className="chip chip--gold">{course.category.name}</span><span className="chip">一般向け医療教育</span></div><h1>{course.title}</h1><p className="course-hero__summary">{course.summary}</p><div className="detail-meta"><span><UserRound size={16} />{course.doctor.name}</span><span><Clock3 size={16} />{course.durationMinutes}分</span><span><FileText size={16} />医学レビュー {formatDate(course.reviewedAt)}</span></div><div className="hero__actions"><button className="button-primary" onClick={bought ? () => setPlayerOpen(true) : handlePurchase}>{bought ? <><Play size={18} />視聴を開始する</> : <><LockKeyhole size={18} />購入して視聴する</>}</button><button className={`button-secondary ${actions?.wishlisted ? "is-saved" : ""}`} onClick={handleWishlist}><Bookmark size={18} fill={actions?.wishlisted ? "currentColor" : "none"} />{actions?.wishlisted ? "マイリスト済み" : "マイリスト"}</button></div><p className="micro-copy">実課金を行わないデモ購入です。カード情報の送信や実際の課金は発生しません。</p></div><button className="preview-art" onClick={() => setPreviewOpen(true)} aria-label="無料プレビューを再生"><CourseArtwork theme={course.thumbnailTheme} category={course.category.name} title={course.title} /><span className="preview-art__play"><CirclePlay size={44} /></span><span className="preview-art__caption">{course.previewLabel}</span></button></div></div></section>

    <section className="course-body"><div className="container course-body__grid"><article className="course-main"><span className="eyebrow eyebrow--gold">ABOUT THIS COURSE</span><h2>講座について</h2><p>{course.description}</p><div className="info-pairs"><section><span className="info-pairs__icon"><UserRound size={18} /></span><h3>対象となる方</h3><p>{course.intendedFor}</p></section><section><span className="info-pairs__icon"><BookOpen size={18} /></span><h3>この講座で学べること</h3><ul>{splitText(course.learningPoints).map(point => <li key={point}><Check size={15} />{point}</li>)}</ul></section></div>
      <section className="doctor-block"><div className="doctor-avatar">{course.doctor.initials}</div><div><span className="eyebrow">制作・監修医師</span><h2>{course.doctor.name}</h2><strong>{course.doctor.specialty} ／ {course.doctor.affiliation}</strong><p>{course.doctorProfile}</p></div></section>
      <section className="course-documentation"><span className="eyebrow eyebrow--gold">TRANSPARENCY</span><h2>参考文献・COI</h2><h3>参考文献</h3><ol>{splitText(course.referencesText).map(reference => <li key={reference}>{reference}</li>)}</ol><h3>利益相反（COI）</h3><p>{course.coiText}</p></section>
    </article>
    <aside className="course-sidebar"><div className="purchase-card"><span>税込価格</span><strong>{formatYen(course.price)}</strong><p>買い切り視聴権</p><button className="button-primary button-primary--full" onClick={bought ? () => setPlayerOpen(true) : handlePurchase}>{bought ? <><CirclePlay size={17} />視聴を開始する</> : <><Play size={17} />デモ購入手続きへ</>}</button><ul><li><CheckCircle2 size={15} />購入後は何度でも視聴可能</li><li><CheckCircle2 size={15} />視聴進捗をマイページで確認</li><li><CheckCircle2 size={15} />7日以内・20%未満の返金申請条件</li></ul></div><div className="medical-alert"><AlertTriangle size={18} /><div><strong>医療情報に関する重要事項</strong><p>本コンテンツは一般向け医療教育情報です。個別の診断、治療、処方、服薬変更、効果保証を行うものではありません。症状や治療については医療機関でご相談ください。</p></div></div><div className="transparency-card"><ShieldCheck size={18} /><div><strong>情報の透明性</strong><dl><dt>公開日</dt><dd>{formatDate(course.publishedAt)}</dd><dt>最終医学レビュー</dt><dd>{formatDate(course.reviewedAt)}</dd><dt>販売主体</dt><dd>MediVista Academy</dd></dl></div></div></aside></div></section>

    {previewOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="無料プレビュー"><div className="preview-modal"><button className="modal-close" onClick={() => setPreviewOpen(false)} aria-label="閉じる"><X size={20} /></button><div className="preview-modal__screen"><video ref={previewVideoRef} className="learning-video" src={previewVideoUrl} controls autoPlay loop playsInline aria-label={`${course.title}の無料プレビュー`} /><div className="preview-modal__screen-copy"><span>FREE PREVIEW</span><strong>この講座で扱う3つの視点</strong><p>目的を知る ／ 確認したい情報を整理する ／ 医療者との対話を準備する</p></div></div><div className="preview-modal__body"><span className="eyebrow eyebrow--gold">FREE PREVIEW</span><h2>{course.title}</h2><p>講座の構成や考え方を確認するための、再生可能な無料プレビューです。個別の診療、治療、処方を指示する内容は含みません。</p><button className="button-primary" onClick={() => setPreviewOpen(false)}>講座詳細に戻る</button></div></div></div>}
    {purchaseOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="デモ購入確認"><div className="purchase-modal"><button className="modal-close" onClick={() => setPurchaseOpen(false)} aria-label="閉じる"><X size={20} /></button><span className="eyebrow eyebrow--gold">DEMO CHECKOUT</span><h2>デモ購入を確認する</h2><p className="purchase-modal__course">{course.title}</p><div className="purchase-modal__total"><span>デモ購入価格</span><strong>{formatYen(course.price)}</strong></div><div className="demo-note"><CheckCircle2 size={18} /><p>これは実課金のないデモ決済です。カード会社への送信、請求、実際の金銭の移動は一切発生しません。</p></div><button className="button-primary button-primary--full" onClick={() => purchase.mutate({ courseId: course.id })} disabled={purchase.isPending}>{purchase.isPending ? "処理中…" : "デモ購入を完了する"}</button><button className="text-button" onClick={() => setPurchaseOpen(false)}>キャンセル</button></div></div>}
    {playerOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="学習プレーヤー"><div className="player-modal"><button className="modal-close" onClick={() => setPlayerOpen(false)} aria-label="閉じる"><X size={20} /></button><div className="player-modal__screen"><video ref={playerVideoRef} className="learning-video" src={previewVideoUrl} controls autoPlay loop playsInline onLoadedMetadata={event => { const savedSeconds = actions?.progress?.lastPositionSeconds ?? 0; if (savedSeconds > 0 && savedSeconds < event.currentTarget.duration) event.currentTarget.currentTime = savedSeconds; }} onTimeUpdate={event => { const video = event.currentTarget; setDemoProgress(calculateVideoProgress(video.currentTime, video.duration)); }} aria-label={`${course.title}の学習プレーヤー`} /></div><div className="player-modal__body"><span className="eyebrow eyebrow--gold">LEARNING PLAYER</span><h2>{course.title}</h2><div className="progress-line"><span style={{ width: `${demoProgress || actions?.progress?.progressPercent || 0}%` }} /></div><div className="player-modal__meta"><span>進捗 {demoProgress || actions?.progress?.progressPercent || 0}%</span><span>{course.durationMinutes}分</span></div><button className="button-primary button-primary--full" onClick={saveProgress} disabled={progress.isPending}><HeartPulse size={17} />{progress.isPending ? "保存中…" : "現在の視聴位置を保存する"}</button><p>このデモ環境では、購入後の視聴導線と進捗保存を検証するための映像を再生しています。</p></div></div></div>}
  </SiteFrame>;
}
