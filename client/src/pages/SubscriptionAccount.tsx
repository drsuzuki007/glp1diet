import { useEffect, useState } from "react";
import { ExternalLink, FileText, CreditCard, ShieldCheck, CalendarClock, CircleOff } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import SiteFrame from "@/components/SiteFrame";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDate, formatYen } from "@/lib/course";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SubscriptionAccount() {
  const search = useSearch();
  const { loading, isAuthenticated } = useAuth();
  const billing = trpc.subscription.billingSummary.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const [cancelOpen, setCancelOpen] = useState(false);
  const portal = trpc.subscription.createBillingPortal.useMutation({ onSuccess: result => window.location.assign(result.url), onError: () => toast.error("Stripe請求ポータルを開けませんでした。") });
  const cancellation = trpc.subscription.scheduleCancellation.useMutation({ onSuccess: () => { setCancelOpen(false); utils.subscription.billingSummary.invalidate(); utils.subscription.mine.invalidate(); toast.success("次回更新日に解約されるよう設定しました。"); }, onError: () => toast.error("解約予約を設定できませんでした。Stripe請求ポータルからお試しください。") });

  useEffect(() => { if (isAuthenticated && new URLSearchParams(search).get("billing") === "updated") billing.refetch(); }, [isAuthenticated, search]);

  if (loading) return <SiteFrame><div className="page-loading container"><span /></div></SiteFrame>;
  if (!isAuthenticated) return <SiteFrame><section className="auth-prompt"><CreditCard size={28} /><span className="eyebrow eyebrow--gold">SUBSCRIPTION MANAGEMENT</span><h1>契約管理にはログインが必要です</h1><p>現在のプラン、請求履歴、支払い方法、解約予定を安全に確認できます。</p><button className="button-primary" onClick={() => startLogin("/account/subscription")}>ログインして契約を確認</button></section></SiteFrame>;

  const data = billing.data;
  const subscribed = data?.subscribed ?? false;
  const endDate = data?.subscription?.currentPeriodEnd;
  const cancellationScheduled = data?.subscription?.cancelAtPeriodEnd ?? false;
  const invoices = data?.invoices ?? [];
  return <SiteFrame><section className="subscription-account"><div className="container"><div className="subscription-account__heading"><div><span className="eyebrow eyebrow--gold">YOUR SUBSCRIPTION</span><h1>契約内容の確認・管理</h1><p>料金プラン、次回請求、支払い方法、請求履歴を確認できます。</p></div><Link href="/pricing" className="button-secondary">料金プランを見る</Link></div><section className={`subscription-account__plan ${subscribed ? "is-active" : ""}`}><div><span className="eyebrow">{subscribed ? cancellationScheduled ? "CANCELLATION SCHEDULED" : "ACTIVE STANDARD PLAN" : "NO ACTIVE PLAN"}</span><h2>{subscribed ? "STANDARDプラン" : "現在はFREEプランです"}</h2><p>{subscribed ? cancellationScheduled && endDate ? `${formatDate(endDate)}までは全講座を視聴できます。その後は自動的にFREEプランへ切り替わります。` : "医師制作・監修のすべての講座を視聴できます。" : "STANDARDプランに申し込むと、すべての講座を視聴できます。"}</p></div><div className="subscription-account__price"><strong>{subscribed ? formatYen(980) : formatYen(0)}</strong><span>（税込） / 月</span></div></section><div className="subscription-account__grid"><section className="subscription-account__card"><CalendarClock size={20} /><h2>{cancellationScheduled ? "視聴可能期限" : "次回請求日"}</h2><strong>{subscribed && endDate ? formatDate(endDate) : "—"}</strong><p>{cancellationScheduled ? "期限までは引き続きご利用いただけます。" : subscribed ? "次回更新時にStripeから請求されます。" : "お申し込み後に表示されます。"}</p></section><section className="subscription-account__card"><CreditCard size={20} /><h2>支払い方法</h2><strong>{data?.cardLast4 ? `${data.cardBrand ?? "Card"} •••• ${data.cardLast4}` : "Stripeで管理"}</strong><p>カード情報の確認・変更はStripe請求ポータルで安全に行えます。</p></section><section className="subscription-account__card"><ShieldCheck size={20} /><h2>プラン変更</h2><strong>STANDARD</strong><p>現在はSTANDARD単一プランです。今後のプラン追加時もこちらから変更できます。</p></section></div><section className="subscription-account__actions">{subscribed ? <><button className="button-secondary" onClick={() => portal.mutate()} disabled={portal.isPending}>{portal.isPending ? "ポータルを準備中…" : "支払い方法を変更"}<ExternalLink size={16} /></button>{cancellationScheduled ? <span className="subscription-account__scheduled"><CircleOff size={17} />解約予約済み</span> : <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}><AlertDialogTrigger asChild><button className="button-danger">解約する</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>解約を予約しますか？</AlertDialogTitle><AlertDialogDescription>{endDate ? `${formatDate(endDate)}まではSTANDARDプランを利用できます。次回請求は行われません。` : "次回更新日までSTANDARDプランをご利用いただけます。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>戻る</AlertDialogCancel><AlertDialogAction onClick={() => cancellation.mutate()} disabled={cancellation.isPending}>{cancellation.isPending ? "設定中…" : "解約を予約する"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</> : <Link href="/pricing" className="button-primary">STANDARDプランに申し込む</Link>}</section><section className="invoice-history"><div className="invoice-history__heading"><div><span className="eyebrow eyebrow--gold">INVOICE HISTORY</span><h2>請求履歴</h2></div><FileText size={22} /></div>{billing.isLoading ? <div className="library-skeleton" /> : invoices.length ? <div className="invoice-history__table"><div className="invoice-history__row invoice-history__row--head"><span>日付</span><span>金額</span><span>状態</span><span>領収書</span></div>{invoices.map(invoice => <div className="invoice-history__row" key={invoice.id}><span>{formatDate(invoice.createdAt)}</span><strong>{formatYen(invoice.amountPaid)}</strong><span>{invoice.status === "paid" ? "支払済み" : invoice.status ?? "処理中"}</span>{(invoice.hostedInvoiceUrl ?? invoice.invoicePdf) ? <a href={invoice.hostedInvoiceUrl ?? invoice.invoicePdf ?? "#"} target="_blank" rel="noreferrer">確認する <ExternalLink size={14} /></a> : <span>—</span>}</div>)}</div> : <p className="invoice-history__empty">請求履歴はまだありません。お申し込み後の請求情報はここに表示されます。</p>}</section></div></section></SiteFrame>;
}
