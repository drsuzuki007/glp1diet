import { BookOpenCheck, LogIn, LogOut, Menu, Search, X } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const navItems = [
  { href: "/", label: "ホーム" },
  { href: "/catalog", label: "動画を探す" },
  { href: "/catalog?category=glp1-basics", label: "テーマ別" },
  { href: "/mypage?tab=wishlist", label: "マイリスト" },
  { href: "/mypage", label: "加入状況" },
];

export function SiteHeader() {
  const [location, navigate] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const normalized = query.trim();
    navigate(`/catalog${normalized ? `?search=${encodeURIComponent(normalized)}` : ""}`);
    setSearchOpen(false);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    if (location.startsWith("/mypage")) navigate("/");
  };

  return (
    <>
      <div className="medical-notice" role="note">一般向け医療教育サービスです。個別の診療・診断・処方は行いません。</div>
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/" className="brand" aria-label="glp1.diet ホーム">
            <span className="brand__mark"><BookOpenCheck size={22} /></span>
            <span><b>glp1.diet</b><small>MEDICAL EDUCATION</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="メインナビゲーション">
            {navItems.map(item => <Link key={item.href} href={item.href} className={location === item.href ? "is-active" : ""}>{item.label}</Link>)}
          </nav>
          <div className="header-actions">
            <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="講座を検索"><Search size={19} /></button>
            {!loading && (isAuthenticated ? (
              <button className="account-button" onClick={handleLogout} title={`${user?.name ?? "アカウント"}としてログイン中`}><LogOut size={16} /><span>ログアウト</span></button>
            ) : (
              <button className="account-button account-button--light" onClick={() => startLogin()}><LogIn size={16} /><span>ログイン</span></button>
            ))}
            <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(value => !value)} aria-label="メニューを開く"><Menu size={20} /></button>
          </div>
        </div>
        {menuOpen && <nav className="mobile-nav" aria-label="モバイルナビゲーション">
          {navItems.map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
        </nav>}
      </header>
      {searchOpen && <div className="search-overlay" role="dialog" aria-modal="true" aria-label="講座を検索">
        <form className="search-panel" onSubmit={submitSearch}>
          <button type="button" className="icon-button search-panel__close" onClick={() => setSearchOpen(false)} aria-label="検索を閉じる"><X size={20} /></button>
          <span className="eyebrow">SEARCH THE LIBRARY</span>
          <h2>興味のあるテーマから<br />講座を探す</h2>
          <label className="search-field"><Search size={20} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="タイトル、医師名、テーマから検索" /><button type="submit">検索する</button></label>
          <p>講座名、医師名、GLP-1、食事、検査値などのキーワードで検索できます。</p>
        </form>
      </div>}
    </>
  );
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer__grid">
      <section><Link href="/" className="brand brand--footer"><span className="brand__mark"><BookOpenCheck size={20} /></span><span><b>glp1.diet</b><small>MEDICAL EDUCATION</small></span></Link><p>GLP-1、糖代謝、生活習慣を、医師制作・監修の一般向け教育講座で学ぶための動画サービスです。</p><small>月額サブスクリプションで全講座を視聴できます。個別の診療・処方・効果保証は行いません。</small></section>
      <section><span className="footer-label">サービス</span><Link href="/catalog">動画を探す</Link><Link href="/mypage">マイページ</Link><Link href="/for-doctors">制作医師の方へ</Link></section>
      <section><span className="footer-label">ポリシー</span><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/commercial">特定商取引法に基づく表記</Link><Link href="/medical-disclaimer">医療情報に関する免責</Link></section>
    </div>
    <div className="site-footer__bottom"><span>© 2026 glp1.diet. All rights reserved.</span><span>医療教育情報を、確かな理解へ。</span></div>
  </footer>;
}

export default function SiteFrame({ children }: { children: ReactNode }) {
  return <div className="app-shell"><SiteHeader /><main>{children}</main><SiteFooter /></div>;
}
