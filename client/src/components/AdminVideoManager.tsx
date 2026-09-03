import { AlertTriangle, CheckCircle2, Clapperboard, Globe, Link2Off, Loader2, Lock, Search, Unlock } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * 管理画面の動画登録パネル。
 *
 * Vimeo の URL を貼り付けて「情報を取得」を押すと、タイトル・サムネイル・再生時間を
 * サーバー側（adminProcedure）で取得して確認できる。「この講座に登録する」で講座に
 * 割り当て、既定で新着動画枠の先頭へ繰り上げる。
 */
export function AdminVideoManager() {
  const utils = trpc.useUtils();
  const library = trpc.catalog.videoLibrary.useQuery();
  const restriction = trpc.catalog.embedRestrictionStatus.useQuery();

  const [courseId, setCourseId] = useState("");
  const [url, setUrl] = useState("");
  const [addToNewArrivals, setAddToNewArrivals] = useState(true);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const invalidate = () => {
    utils.catalog.videoLibrary.invalidate();
    utils.catalog.rows.invalidate();
    utils.catalog.adminRows.invalidate();
  };

  const resolve = trpc.catalog.resolveVimeo.useMutation({
    onSuccess: () => setMessage(null),
    onError: error => setMessage({ tone: "error", text: error.message }),
  });

  const assign = trpc.catalog.assignVimeo.useMutation({
    onSuccess: result => {
      invalidate();
      setUrl("");
      resolve.reset();
      restriction.refetch();
      const restrictionNote = result.embedDomains.length === 0
        ? ""
        : result.embedRestriction.applied
          ? ` Vimeo 側を「${result.embedDomains.join(" / ")} のみ埋め込み可」に設定しました。`
          : ` ただし Vimeo のドメイン制限に失敗しました: ${result.embedRestriction.error ?? "原因不明"}`;
      setMessage({
        tone: result.embedDomains.length > 0 && !result.embedRestriction.applied ? "error" : "ok",
        text: `「${result.course.title}」に登録しました。${addToNewArrivals ? "新着動画枠の先頭に表示されます。" : ""}${restrictionNote}`,
      });
    },
    onError: error => setMessage({ tone: "error", text: error.message }),
  });

  const applyRestriction = trpc.catalog.applyEmbedRestriction.useMutation({
    onSuccess: result => {
      restriction.refetch();
      const failed = result.results.filter(item => !item.applied);
      setMessage(
        failed.length === 0
          ? { tone: "ok", text: `${result.results.length}件の動画を「${result.domains.join(" / ")} のみ埋め込み可」に設定しました。` }
          : { tone: "error", text: `${failed.length}件で失敗しました: ${failed.map(f => `${f.courseTitle}（${f.error ?? "原因不明"}）`).join(" / ")}` }
      );
    },
    onError: error => setMessage({ tone: "error", text: error.message }),
  });

  const release = trpc.catalog.releaseEmbedRestriction.useMutation({
    onSuccess: result => {
      restriction.refetch();
      setMessage({ tone: "ok", text: `${result.results.length}件の制限を解除しました（どのドメインでも埋め込み可）。` });
    },
    onError: error => setMessage({ tone: "error", text: error.message }),
  });

  const clear = trpc.catalog.clearVimeo.useMutation({
    onSuccess: result => {
      invalidate();
      setMessage({ tone: "ok", text: `「${result.title}」の動画割り当てを解除しました。` });
    },
    onError: error => setMessage({ tone: "error", text: error.message }),
  });

  const metadata = resolve.data;
  const courses = library.data ?? [];
  const selected = courses.find(course => String(course.id) === courseId);
  const assigned = courses.filter(course => course.vimeoId);

  return (
    <article className="admin-row-card admin-video-manager">
      <header>
        <div className="admin-row-card__title">
          <Clapperboard size={18} />
          <div>
            <strong>動画を登録する</strong>
            <span>Vimeo の URL を貼り付けると、タイトル・サムネイル・再生時間を自動で取得します。</span>
          </div>
        </div>
      </header>

      <div className="admin-video-manager__form">
        <label>
          <span>登録先の講座</span>
          <select value={courseId} onChange={event => setCourseId(event.target.value)}>
            <option value="">講座を選択</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.vimeoId ? "● " : "○ "}
                {course.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Vimeo の URL</span>
          <input
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="https://vimeo.com/123456789"
            inputMode="url"
          />
        </label>

        <button
          type="button"
          className="button-secondary"
          onClick={() => resolve.mutate({ url })}
          disabled={!url.trim() || resolve.isPending}
        >
          {resolve.isPending ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          情報を取得
        </button>
      </div>

      {metadata && (
        <div className="admin-video-manager__preview">
          {metadata.thumbnailUrl && <img src={metadata.thumbnailUrl} alt="" />}
          <div>
            <strong>{metadata.title || "（タイトルなし）"}</strong>
            <dl>
              <dt>動画 ID</dt>
              <dd>{metadata.id}</dd>
              <dt>再生時間</dt>
              <dd>{metadata.durationSeconds ? `${Math.round(metadata.durationSeconds / 60)}分` : "取得できませんでした"}</dd>
              <dt>公開範囲</dt>
              <dd>{metadata.hash ? "限定公開（ハッシュ付き）" : "公開"}</dd>
            </dl>
            <label className="admin-video-manager__checkbox">
              <input
                type="checkbox"
                checked={addToNewArrivals}
                onChange={event => setAddToNewArrivals(event.target.checked)}
              />
              新着動画枠の先頭に表示する
            </label>
            <button
              type="button"
              className="button-primary"
              onClick={() => assign.mutate({ courseId: Number(courseId), url, addToNewArrivals })}
              disabled={!selected || assign.isPending}
            >
              {assign.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {selected ? `「${selected.title}」に登録する` : "先に講座を選択してください"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={message.tone === "ok" ? "admin-video-manager__ok" : "admin-video-manager__error"} role="status">
          {message.text}
        </p>
      )}

      <div className="admin-video-manager__embed">
        <h3>
          <Globe size={15} />
          埋め込みドメイン制限
        </h3>
        {restriction.isLoading ? (
          <p>Vimeo 側の設定を確認しています…</p>
        ) : restriction.data && restriction.data.domains.length === 0 ? (
          <p className="admin-video-manager__embed-off">
            <Unlock size={14} />
            <span>
              未設定です。現在はどのドメインからでも埋め込めます（localhost・workers.dev でも再生可）。
              glp1.diet へ切り替えるときに <code>VIMEO_EMBED_DOMAINS=glp1.diet,www.glp1.diet</code> を設定し、
              下のボタンで既存の動画にも適用してください。
            </span>
          </p>
        ) : (
          <>
            <p className="admin-video-manager__embed-on">
              <Lock size={14} />
              <span>
                許可ドメイン: <strong>{restriction.data?.domains.join(" / ")}</strong>
              </span>
            </p>
            <ul className="admin-video-manager__embed-list">
              {(restriction.data?.videos ?? []).map(video => {
                const ok = video.embed === "whitelist" && (restriction.data?.domains ?? []).every(d => video.domains.includes(d));
                return (
                  <li key={video.courseId} className={ok ? "is-ok" : "is-pending"}>
                    {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <strong>{video.courseTitle}</strong>
                    <small>
                      {video.error
                        ? `確認できません: ${video.error}`
                        : ok
                          ? "制限済み"
                          : `未適用（現在: ${video.embed}${video.domains.length ? ` / ${video.domains.join(", ")}` : ""}）`}
                    </small>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="admin-video-manager__embed-actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => applyRestriction.mutate({})}
            disabled={applyRestriction.isPending || (restriction.data?.domains.length ?? 0) === 0}
          >
            {applyRestriction.isPending ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
            登録済みの全動画に適用
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => release.mutate({})}
            disabled={release.isPending}
          >
            {release.isPending ? <Loader2 size={15} className="animate-spin" /> : <Unlock size={15} />}
            制限を解除（切り戻し）
          </button>
        </div>
      </div>

      <div className="admin-video-manager__assigned">
        <h3>登録済みの動画（{assigned.length}件）</h3>
        {assigned.length === 0 ? (
          <p>まだ動画が登録されていません。会員には動画のない講座の再生ボタンは表示されません。</p>
        ) : (
          <ul>
            {assigned.map(course => (
              <li key={course.id}>
                <strong>{course.title}</strong>
                <small>
                  Vimeo {course.vimeoId}
                  {course.vimeoHash ? "（限定公開）" : ""} ・ {course.durationMinutes}分
                </small>
                <button
                  type="button"
                  onClick={() => clear.mutate({ courseId: course.id })}
                  disabled={clear.isPending}
                  aria-label={`${course.title}の動画割り当てを解除`}
                >
                  <Link2Off size={14} />
                  解除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
