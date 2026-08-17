import { ArrowRight, FileCheck2, ShieldCheck, Stethoscope } from "lucide-react";
import { Link, useLocation } from "wouter";
import SiteFrame from "@/components/SiteFrame";

const pageContent: Record<string, { eyebrow: string; title: string; lead: string; sections: { heading: string; body: string }[]; icon: typeof FileCheck2 }> = {
  "/for-doctors": { eyebrow: "FOR MEDICAL PROFESSIONALS", title: "制作医師の方へ", lead: "一般の方が医療情報を理解するための、透明性を大切にした講座制作にご協力ください。", icon: Stethoscope, sections: [{ heading: "glp1.diet の考え方", body: "診断、処方、効果保証と誤認されない表現を大切にしながら、受診時の対話に役立つ一般向け教育コンテンツを届けます。" }, { heading: "制作・監修について", body: "講座ごとに制作医師、医学レビュー日、参考文献、利益相反の情報を表示します。具体的な制作のご相談は運営窓口までお問い合わせください。" }] },
  "/terms": { eyebrow: "TERMS OF USE", title: "利用規約", lead: "glp1.diet の利用に関する基本事項を定めています。", icon: FileCheck2, sections: [{ heading: "サービスの目的", body: "本サービスは、一般の方が医療情報を理解することを補助する教育サービスです。個別の診断、治療、処方、服薬変更を提供するものではありません。" }, { heading: "サブスクリプションとStripe決済", body: "全講座見放題は月額税込980円の継続課金です。加入、請求情報の更新、解約はStripeの安全な決済画面および請求ポータルを通じて行われます。" }] },
  "/privacy": { eyebrow: "PRIVACY", title: "プライバシーポリシー", lead: "学習体験に必要な情報を、目的に沿って適切に取り扱います。", icon: ShieldCheck, sections: [{ heading: "取得する情報", body: "ログイン時のアカウント情報、サブスクリプション加入状態、マイリスト、視聴進捗を、サービス提供と利用状況の表示のために保存します。" }, { heading: "Stripeによる決済", body: "カード番号などの決済情報はStripeが処理します。glp1.dietはStripe Customer IDおよびSubscription IDなど、加入状態の連携に必要な最小限の識別子のみを保存します。" }] },
  "/commercial": { eyebrow: "COMMERCIAL TRANSACTIONS", title: "特定商取引法に基づく表記", lead: "月額サブスクリプションの販売表示についてご案内します。", icon: FileCheck2, sections: [{ heading: "事業者", body: "MyMedipro株式会社" }, { heading: "所在地・連絡先", body: "所在地：（後ほど記入）\n連絡先：（後ほど記入）" }, { heading: "サービス名称・月額料金", body: "MediVista STANDARDプラン。月額料金は税込980円です。Stripe Checkoutで登録した支払方法により、加入日を基準として毎月請求されます。" }, { heading: "解約・返金ポリシー", body: "解約は契約管理ページまたはStripe請求ポータルからいつでも予約できます。解約予約後も次回更新日までは視聴できます。返金ポリシー：（後ほど記入）" }] },
  "/help": { eyebrow: "HELP & CANCELLATION", title: "解約方法のご案内", lead: "STANDARDプランのご契約内容と解約手続きについてご案内します。", icon: FileCheck2, sections: [{ heading: "解約の手順", body: "ログイン後に「契約管理」を開き、「解約する」を選択してください。確認画面で解約予約を確定すると、次回更新日に自動解約されます。" }, { heading: "解約後の視聴", body: "解約予約後も、次回更新日まではSTANDARDプランの全講座を視聴できます。更新日以降はFREEプランに切り替わり、新たな請求は行われません。" }, { heading: "支払い方法・請求書", body: "支払い方法の変更、請求履歴、領収書の確認は、契約管理ページからStripe請求ポータルを開いて行えます。" }] },
  "/medical-disclaimer": { eyebrow: "MEDICAL INFORMATION", title: "医療情報に関する免責", lead: "安全な情報利用のために、必ずご確認ください。", icon: ShieldCheck, sections: [{ heading: "一般向け教育情報", body: "講座内の情報は一般的な医療教育を目的としています。個人の状態に対する診断、治療、処方、服薬変更、減量効果を保証するものではありません。" }, { heading: "医療機関への相談", body: "症状、検査値、治療などについては、必ず医療機関で医師にご相談ください。緊急性のある症状がある場合は、動画の視聴ではなく適切な医療機関へ連絡してください。" }] },
};

export default function InfoPage() {
  const [location] = useLocation();
  const page = pageContent[location] ?? pageContent["/terms"];
  const Icon = page.icon;
  return <SiteFrame><section className="info-hero"><div className="container"><span className="eyebrow eyebrow--gold">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.lead}</p></div></section><section className="info-body"><div className="container"><div className="info-page-card"><div className="info-page-card__icon"><Icon size={26} /></div>{page.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}</div><Link href="/catalog" className="text-link">講座を探す <ArrowRight size={16} /></Link></div></section></SiteFrame>;
}
