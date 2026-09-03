import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { AdminVideoManager } from "@/components/AdminVideoManager";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import SiteFrame from "@/components/SiteFrame";
import { trpc } from "@/lib/trpc";

type EditableRow = { id: number; name: string; description: string; courseIds: number[] };

export default function CatalogAdmin() {
  const { user, loading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const adminQuery = trpc.catalog.adminRows.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Record<number, string>>({});
  const reorderRows = trpc.catalog.reorderRows.useMutation({ onSuccess: () => { utils.catalog.adminRows.invalidate(); utils.catalog.rows.invalidate(); } });
  const replaceRowCourses = trpc.catalog.replaceRowCourses.useMutation({ onSuccess: () => { utils.catalog.adminRows.invalidate(); utils.catalog.rows.invalidate(); } });

  useEffect(() => {
    if (!adminQuery.data) return;
    setRows(adminQuery.data.rows.map(row => ({ id: row.id, name: row.name, description: row.description, courseIds: row.courses.map(course => course.id) })));
  }, [adminQuery.data]);

  const coursesById = useMemo(() => new Map((adminQuery.data?.courses ?? []).map(course => [course.id, course])), [adminQuery.data?.courses]);
  const moveRow = (rowId: number, direction: -1 | 1) => {
    const index = rows.findIndex(row => row.id === rowId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setRows(next);
    reorderRows.mutate(next.map(row => row.id));
  };
  const moveCourse = (rowId: number, courseId: number, direction: -1 | 1) => setRows(current => current.map(row => {
    if (row.id !== rowId) return row;
    const index = row.courseIds.indexOf(courseId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= row.courseIds.length) return row;
    const courseIds = [...row.courseIds];
    [courseIds[index], courseIds[target]] = [courseIds[target]!, courseIds[index]!];
    return { ...row, courseIds };
  }));
  const addCourse = (rowId: number) => {
    const id = Number(selectedCourse[rowId]);
    if (!id) return;
    setRows(current => current.map(row => row.id === rowId && !row.courseIds.includes(id) ? { ...row, courseIds: [...row.courseIds, id] } : row));
    setSelectedCourse(current => ({ ...current, [rowId]: "" }));
  };
  const removeCourse = (rowId: number, courseId: number) => setRows(current => current.map(row => row.id === rowId ? { ...row, courseIds: row.courseIds.filter(id => id !== courseId) } : row));
  const saveRow = (row: EditableRow) => replaceRowCourses.mutate({ rowId: row.id, courseIds: row.courseIds });

  if (loading) return <SiteFrame><div className="admin-catalog-loading">読み込んでいます…</div></SiteFrame>;
  if (!isAuthenticated) return <SiteFrame><section className="admin-catalog-empty"><h1>カタログ管理</h1><p>カタログ行の編集には管理者ログインが必要です。</p><button className="button-primary" onClick={() => startLogin()}>ログインする</button></section></SiteFrame>;
  if (!isAdmin) return <SiteFrame><section className="admin-catalog-empty"><h1>アクセスできません</h1><p>この画面は管理者専用です。</p><Link href="/catalog" className="button-secondary">動画一覧へ戻る</Link></section></SiteFrame>;

  return <SiteFrame><section className="admin-catalog"><div className="container"><div className="admin-catalog__heading"><div><span className="eyebrow eyebrow--gold">CATALOG ADMINISTRATION</span><h1>動画行を編集する</h1><p>行の順番と、各行に表示する講座・その並び順を変更できます。同じ講座を複数の行へ配置できます。</p></div><Link href="/catalog" className="button-secondary">公開一覧を確認する</Link></div><AdminVideoManager />{adminQuery.isLoading ? <div className="admin-catalog-loading">カタログ設定を読み込んでいます…</div> : <div className="admin-catalog__rows">{rows.map((row, rowIndex) => <article className="admin-row-card" key={row.id}><header><div className="admin-row-card__title"><GripVertical size={18} /><div><strong>{row.name}</strong><span>{row.description}</span></div></div><div className="admin-row-card__actions"><button type="button" onClick={() => moveRow(row.id, -1)} disabled={rowIndex === 0 || reorderRows.isPending} aria-label={`${row.name}を上へ移動`}><ArrowUp size={16} /></button><button type="button" onClick={() => moveRow(row.id, 1)} disabled={rowIndex === rows.length - 1 || reorderRows.isPending} aria-label={`${row.name}を下へ移動`}><ArrowDown size={16} /></button></div></header><div className="admin-row-card__courses">{row.courseIds.map((courseId, index) => { const course = coursesById.get(courseId); if (!course) return null; return <div className="admin-course-item" key={courseId}><span>{index + 1}</span><strong>{course.title}</strong><small>{course.doctor.name} ・ {course.durationMinutes}分</small><div><button type="button" onClick={() => moveCourse(row.id, courseId, -1)} disabled={index === 0} aria-label={`${course.title}を前へ移動`}><ArrowUp size={14} /></button><button type="button" onClick={() => moveCourse(row.id, courseId, 1)} disabled={index === row.courseIds.length - 1} aria-label={`${course.title}を後へ移動`}><ArrowDown size={14} /></button><button type="button" onClick={() => removeCourse(row.id, courseId)} aria-label={`${course.title}を行から外す`}><Trash2 size={14} /></button></div></div>; })}</div><div className="admin-row-card__footer"><label><span>講座を追加</span><select value={selectedCourse[row.id] ?? ""} onChange={event => setSelectedCourse(current => ({ ...current, [row.id]: event.target.value }))}><option value="">講座を選択</option>{(adminQuery.data?.courses ?? []).filter(course => !row.courseIds.includes(course.id)).map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><button type="button" className="button-secondary admin-add-course" onClick={() => addCourse(row.id)}><Plus size={15} />追加</button><button type="button" className="button-primary admin-save-row" onClick={() => saveRow(row)} disabled={replaceRowCourses.isPending}><Save size={15} />この行を保存</button></div></article>)}</div>}</div></section></SiteFrame>;
}
