import { useEffect } from "react";
import { CheckCircle2, MailCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import SiteFrame from "@/components/SiteFrame";
import { trpc } from "@/lib/trpc";

export default function SubscriptionSuccess() {
  const { isAuthenticated } = useAuth();
  const refresh = trpc.subscription.refresh.useMutation();
  useEffect(() => { if (isAuthenticated) refresh.mutate(); }, [isAuthenticated]);
  return <SiteFrame><section className="subscription-success"><div className="container"><div className="subscription-success__card"><CheckCircle2 size={48} /><span className="eyebrow eyebrow--gold">SUBSCRIPTION COMPLETE</span><h1>STANDARDプランへの<br />お申し込みを受け付けました</h1><p>Stripeから登録メールアドレス宛に確認メールが送信されます。契約状況の反映には少し時間がかかる場合があります。</p><div className="subscription-success__note"><MailCheck size={20} /><span>請求履歴・支払い方法・解約の予約は、契約管理ページからいつでも確認できます。</span></div><div className="subscription-success__actions"><Link href="/account/subscription" className="button-primary">契約内容を確認 <ArrowRight size={17} /></Link><Link href="/catalog" className="button-secondary">講座を探す</Link></div></div></div></section></SiteFrame>;
}
