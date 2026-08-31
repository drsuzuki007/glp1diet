import { CheckCircle2, KeyRound, ReceiptText, UsersRound } from "lucide-react";
import { Link } from "wouter";
import SiteFrame from "@/components/SiteFrame";

export default function TeamSuccess() {
  return (
    <SiteFrame>
      <section className="subscription-success">
        <div className="subscription-success__card">
          <div className="subscription-success__icon"><CheckCircle2 size={32} /></div>
          <span className="eyebrow eyebrow--gold">TEAM PLAN STARTED</span>
          <h1>チームプランのお申し込みを受け付けました</h1>
          <p>Stripeでのお支払い完了後、Webhook同期が完了すると、チーム管理ページでアクセスコードとシート数を確認できます。</p>
          <ol className="team-success-steps">
            <li><UsersRound size={18} /><span><strong>チーム管理を開く</strong>契約管理者のメールアドレスでログインし、アクセスコードと利用可能なシート数を確認します。</span></li>
            <li><KeyRound size={18} /><span><strong>アクセスコードを配布</strong>利用者へコードと登録ページを案内してください。</span></li>
            <li><ReceiptText size={18} /><span><strong>シート数と請求を管理</strong>人数・契約内容の変更はチーム管理ページからStripe請求ポータルへ進みます。</span></li>
          </ol>
          <div className="subscription-success__actions">
            <Link href="/team/manage" className="button-primary">チーム管理を開く</Link>
            <Link href="/pricing" className="button-secondary">料金ページへ戻る</Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
