import { CheckCircle2, KeyRound, MailCheck, UsersRound } from "lucide-react";
import { Link } from "wouter";
import SiteFrame from "@/components/SiteFrame";

export default function TeamSuccess() {
  return <SiteFrame><section className="subscription-success"><div className="subscription-success__card"><div className="subscription-success__icon"><CheckCircle2 size={32} /></div><span className="eyebrow eyebrow--gold">TEAM PLAN STARTED</span><h1>チームプランのお申し込みを受け付けました</h1><p>Stripeでのお支払い完了後、契約管理者のメールアドレスへアクセスコードと利用者向け案内文をお送りします。</p><ol className="team-success-steps"><li><UsersRound size={18} /><span><strong>アクセスコードを配布</strong>利用者へコードと登録ページをご案内ください。</span></li><li><KeyRound size={18} /><span><strong>利用者が自分で登録</strong>ログイン後にコードを入力すると、空きシートの範囲で視聴できます。</span></li><li><MailCheck size={18} /><span><strong>シート数と請求を管理</strong>管理者メールアドレスでチーム管理ページを開いてください。</span></li></ol><div className="subscription-success__actions"><Link href="/team/manage" className="button-primary">チーム管理を開く</Link><Link href="/pricing" className="button-secondary">料金ページへ戻る</Link></div></div></section></SiteFrame>;
}
