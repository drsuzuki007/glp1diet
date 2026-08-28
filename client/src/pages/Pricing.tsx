import { Building2, Check, CircleAlert, CreditCard, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import SiteFrame from "@/components/SiteFrame";
import { formatYen } from "@/lib/course";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const features = [
  ["医師制作・監修の全動画講座", true],
  ["ページ内プレーヤーでの視聴", true],
  ["視聴位置・学習進捗の保存", true],
  ["マイリスト・おすすめ講座", true],
  ["請求ポータルでの支払い方法変更", true],
] as const;

export default function Pricing() {
  const search = useSearch();
  const { loading, isAuthenticated } = useAuth();
  const subscription = trpc.subscription.mine.useQuery(undefined, { enabled: isAuthenticated });
  const teamPaymentLink = trpc.team.paymentLink.useQuery();
  const checkout = trpc.subscription.createCheckout.useMutation({
    onSuccess: result => {
      if (result.alreadySubscribed) return toast.success("すでにSTANDARDプランへ加入済みです。");
      window.location.assign(result.url!);
    },
    onError: () => toast.error("決済ページを準備できませんでした。時間をおいて再度お試しください。"),
  });
  const hasTriggeredLoginCheckout = useRef(false);
  const isCurrentPlan = subscription.data?.subscribed ?? false;
  useEffect(() => {
    if (!isAuthenticated || !new URLSearchParams(search).has("intent") || hasTriggeredLoginCheckout.current) return;
    hasTriggeredLoginCheckout.current = true;
    checkout.mutate();
  }, [isAuthenticated, search]);
  const beginCheckout = () => {
    if (!isAuthenticated) return startLogin("/pricing?intent=checkout");
    checkout.mutate();
  };
  const beginTeamCheckout = () => {
    if (!teamPaymentLink.data?.url) return toast.error("チームプランの決済ページを準備中です。時間をおいて再度お試しください。");
    window.location.assign(teamPaymentLink.data.url);
  };

  return <SiteFrame><section className="pricing-hero"><div className="container"><span className="eyebrow eyebrow--gold">PLANS & BILLING</span><h1>学びを続けるための<br />シンプルな料金プラン</h1><p>個人でも、組織の学びでも。医師制作・監修の全講座を月額でいつでも視聴できます。個別の診療、処方、効果保証を行うサービスではありません。</p></div></section><section className="pricing-page"><div className="container"><div className="pricing-card-wrap"><article className="pricing-card pricing-card--standard">{isCurrentPlan && <span className="pricing-card__current">現在のプラン</span>}<div className="pricing-card__icon"><Sparkles size={22} /></div><span className="eyebrow eyebrow--gold">STANDARD PLAN</span><h2>STANDARD</h2><p className="pricing-card__lead">すべての講座を、あなたのペースで。</p><div className="pricing-card__price"><strong>{formatYen(980)}</strong><span>（税込） / 月</span></div><ul>{features.slice(0, 4).map(([label]) => <li key={label}><Check size={16} />{label}</li>)}</ul><button className="button-primary pricing-card__button" onClick={beginCheckout} disabled={loading || checkout.isPending || isCurrentPlan}>{isCurrentPlan ? "現在のプラン" : checkout.isPending ? "決済ページを準備中…" : "このプランに申し込む"}</button><small><ShieldCheck size={14} />Stripeの安全な決済ページでお支払いいただけます</small></article></div><section className="pricing-compare" aria-label="STANDARDプランの機能比較"><div className="pricing-compare__heading"><span className="eyebrow eyebrow--gold">FEATURES</span><h2>STANDARDプランでできること</h2></div><div className="pricing-compare__table"><div className="pricing-compare__row pricing-compare__row--head"><span>機能</span><strong>STANDARD</strong></div>{features.map(([label, included]) => <div className="pricing-compare__row" key={label}><span>{label}</span><strong aria-label={included ? "利用可能" : "利用不可"}>{included ? "○" : "×"}</strong></div>)}</div></section><section className="team-pricing" aria-label="チームプランのご案内"><div className="team-pricing__intro"><div className="team-pricing__icon"><Building2 size={25} /></div><div><span className="eyebrow eyebrow--gold">FOR COMPANIES & HEALTH INSURERS</span><h2>チームプラン</h2><p>企業・健康保険組合のメンバーで、全講座を学べる組織向けプランです。契約人数に応じて、1人あたりの月額料金が変わります。</p></div></div><div className="team-pricing__tiers"><article><strong>1〜9名</strong><span>1人あたり</span><b>{formatYen(980)}</b><small>（税込） / 月</small></article><article><strong>10〜49名</strong><span>1人あたり</span><b>{formatYen(780)}</b><small>（税込） / 月</small></article><article><strong>50名以上</strong><span>1人あたり</span><b>{formatYen(580)}</b><small>（税込） / 月</small></article></div><div className="team-pricing__flow"><span><b>1</b>人数を選んで決済</span><span><b>2</b>アクセスコードが届く</span><span><b>3</b>利用者がコードを入力して視聴開始</span></div><div className="team-pricing__footer"><p><UsersRound size={18} />契約管理者は、アクセスコード・登録人数・シート数をチーム管理ページから確認できます。</p><button type="button" className="button-primary" onClick={beginTeamCheckout} disabled={teamPaymentLink.isLoading || !teamPaymentLink.data?.url}>{teamPaymentLink.isLoading ? "決済ページを準備中…" : "チームプランを契約する"}</button></div><small className="team-pricing__note">チームプランにも、一般向け医療教育サービスであり、個別の診断・治療・処方・効果保証を行わない旨の免責が適用されます。請求書払いなどの個別対応はお問い合わせください。</small></section><section className="pricing-notes"><CreditCard size={21} /><div><h2>お申し込みと解約について</h2><p>お申し込み後はStripe Checkoutへ進みます。解約はいつでも契約管理ページまたはStripe請求ポータルから予約でき、次回更新日までは引き続きご利用いただけます。</p></div></section><p className="pricing-legal-link"><CircleAlert size={15} /><a href="/commercial">特定商取引法に基づく表記</a>と<a href="/help">解約方法のご案内</a>をご確認ください。</p></div></section></SiteFrame>;
}
