import { Building2, CreditCard, KeyRound, LockKeyhole, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import SiteFrame from "@/components/SiteFrame";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function TeamManage() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const dashboard = trpc.team.admin.useQuery(undefined, { enabled: isAuthenticated });
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null);
  const removeMember = trpc.team.removeMember.useMutation({
    onSuccess: () => { utils.team.admin.invalidate(); toast.success("メンバーを削除しました。利用枠が1つ空きました。"); setPendingMemberId(null); },
    onError: error => toast.error(error.message),
  });
  const portal = trpc.team.createBillingPortal.useMutation({
    onSuccess: result => window.location.assign(result.url),
    onError: error => toast.error(error.message),
  });

  if (loading) return <SiteFrame><div className="page-loading container"><span /></div></SiteFrame>;
  if (!isAuthenticated) return <SiteFrame><section className="auth-prompt"><div className="auth-prompt__icon"><LockKeyhole size={28} /></div><span className="eyebrow eyebrow--gold">TEAM ADMIN</span><h1>チーム管理にはログインが必要です</h1><p>契約時の管理者メールアドレスと同じアカウントでログインしてください。</p><button className="button-primary" onClick={() => startLogin("/team/manage")}>ログインする</button></section></SiteFrame>;
  if (dashboard.isLoading) return <SiteFrame><div className="page-loading container"><span /></div></SiteFrame>;
  if (!dashboard.data) return <SiteFrame><section className="auth-prompt"><div className="auth-prompt__icon"><Building2 size={28} /></div><span className="eyebrow eyebrow--gold">TEAM ADMIN</span><h1>管理できるチームがありません</h1><p>チームプランの契約時に使用したメールアドレスでログインしているかをご確認ください。</p><Link href="/team/join" className="button-primary">チームコードを登録する</Link></section></SiteFrame>;

  const { team, members } = dashboard.data;
  const availableSeats = Math.max(0, team.seatCount - members.length);
  return <SiteFrame><section className="team-hero"><div className="container"><span className="eyebrow eyebrow--gold">TEAM ADMINISTRATION</span><h1>チーム管理</h1><p>アクセスコード、登録メンバー、契約シート数を確認できます。</p></div></section><section className="team-page"><div className="container"><section className="team-admin-overview"><article><Building2 size={22} /><span>チーム名</span><strong>{team.teamName}</strong></article><article><KeyRound size={22} /><span>アクセスコード</span><strong className="team-admin-overview__code">{team.accessCode}</strong></article><article><UsersRound size={22} /><span>登録メンバー</span><strong>{members.length} / {team.seatCount}名</strong><small>残り {availableSeats}枠</small></article></section><section className="team-admin-panel"><div className="team-admin-panel__heading"><div><span className="eyebrow eyebrow--gold">MEMBERS</span><h2>登録メンバー</h2><p>アクセスコードを共有すると、空いている契約シートの範囲で利用者が自分で登録できます。</p></div><button type="button" className="button-secondary" onClick={() => portal.mutate()} disabled={portal.isPending}><CreditCard size={16} />{portal.isPending ? "準備中…" : "シート数・請求を管理"}</button></div>{members.length ? <div className="team-member-list">{members.map(member => <article key={member.id}><div><strong>{member.name ?? "名前未設定"}</strong><span>{member.email ?? "メールアドレス未設定"} ・ {new Date(member.joinedAt).toLocaleDateString("ja-JP")}登録</span></div>{pendingMemberId === member.id ? <div className="team-member-list__confirm"><span>削除しますか？</span><button onClick={() => removeMember.mutate({ memberId: member.id })} disabled={removeMember.isPending}>削除する</button><button onClick={() => setPendingMemberId(null)} disabled={removeMember.isPending}>戻る</button></div> : <button className="icon-button" onClick={() => setPendingMemberId(member.id)} aria-label={`${member.name ?? "メンバー"}を削除する`}><Trash2 size={17} /></button>}</article>)}</div> : <p className="team-admin-panel__empty">まだ登録メンバーはいません。アクセスコードを利用者へ配布してください。</p>}</section><p className="team-page__legal">本プランは一般向けの医療教育動画サービスです。個別の診療、診断、処方、効果保証は行いません。</p></div></section></SiteFrame>;
}
