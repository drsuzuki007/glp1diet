import { Building2, KeyRound, LockKeyhole, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import SiteFrame from "@/components/SiteFrame";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function TeamJoin() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const membership = trpc.team.mine.useQuery(undefined, { enabled: isAuthenticated });
  const [accessCode, setAccessCode] = useState("");
  const join = trpc.team.join.useMutation({
    onSuccess: team => {
      utils.team.mine.invalidate();
      utils.library.mine.invalidate();
      utils.subscription.mine.invalidate();
      toast.success(`${team?.teamName ?? "チーム"}へ登録しました。全講座を視聴できます。`);
    },
    onError: error => toast.error(error.message),
  });

  if (loading) return <SiteFrame><div className="page-loading container"><span /></div></SiteFrame>;
  if (!isAuthenticated) return <SiteFrame><section className="auth-prompt"><div className="auth-prompt__icon"><LockKeyhole size={28} /></div><span className="eyebrow eyebrow--gold">TEAM ACCESS</span><h1>チームコードの登録にはログインが必要です</h1><p>所属組織から配布されたコードを、ログイン後に安全に登録できます。</p><button className="button-primary" onClick={() => startLogin("/team/join")}>ログインしてコードを入力</button></section></SiteFrame>;

  const team = membership.data;
  return <SiteFrame><section className="team-hero"><div className="container"><span className="eyebrow eyebrow--gold">TEAM ACCESS</span><h1>チームコードを入力</h1><p>所属組織から配布されたアクセスコードを登録すると、チームプランの視聴権限をご利用いただけます。</p></div></section><section className="team-page"><div className="container team-page__narrow">{team ? <section className="team-card team-card--joined"><Building2 size={25} /><span className="eyebrow eyebrow--aqua">TEAM MEMBERSHIP ACTIVE</span><h2>{team.teamName} に所属しています</h2><p>チームプランの視聴権限が有効です。全講座をいつでもご利用いただけます。</p><dl><div><dt>契約シート数</dt><dd>{team.seatCount}名</dd></div><div><dt>登録日</dt><dd>{new Date(team.joinedAt).toLocaleDateString("ja-JP")}</dd></div></dl><Link href="/catalog" className="button-primary">講座を視聴する</Link></section> : <section className="team-card"><div className="team-card__icon"><KeyRound size={24} /></div><h2>アクセスコードを登録</h2><p>例：<strong>TEAM-A7X2-9KQM</strong>。コードは管理者または所属組織から受け取ってください。</p><form onSubmit={event => { event.preventDefault(); join.mutate(accessCode); }}><label htmlFor="team-code">チームコード</label><input id="team-code" value={accessCode} onChange={event => setAccessCode(event.target.value.toUpperCase())} placeholder="TEAM-XXXX-XXXX" maxLength={14} autoCapitalize="characters" required /><button className="button-primary" type="submit" disabled={join.isPending}>{join.isPending ? "登録しています…" : "チームに登録する"}</button></form><p className="team-card__note"><UsersRound size={16} />1つのアカウントは同時に1つのチームへ所属できます。利用枠が上限に達している場合は、チーム管理者へお問い合わせください。</p></section>}<Link href="/pricing" className="text-link">チームプランについて見る</Link></div></section></SiteFrame>;
}
