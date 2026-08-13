# Wishlist View Verification

The My List view now exposes both supported sort modes and all three filters in its toolbar. In the authenticated browser session, the `unwatched` URL filter produced a `0 / 2講座` result and retained the toolbar together with a clear no-results message. The `inProgress` URL filter produced a `1 / 2講座` result and showed only the 10%-watched saved course.

With `wishlistSort=goalPriority`, the saved food-and-lifestyle course appeared before the saved metabolism course because the user's lifestyle learning goal has priority 2 and the metabolism category is not selected as a goal. The shared unit tests cover newest-save ordering, goal-priority ordering, and the unwatched/in-progress classification; the application browser checks confirmed URL state synchronization and rendered empty states.

The development-only `wishlistPreview=empty` state was verified while authenticated without altering the user's actual saved courses. The My List toolbar rendered `0 / 0講座`, retained both sort choices and all three filters, showed the explanation for saving a course later, and displayed the `マイリストはまだ空です` CTA with a `講座を探す` link. The empty-state component test also verifies this CTA independently.

For the approved real-data verification, the authenticated account's two saved courses were confirmed as `続けやすい食習慣の整え方` and `健康診断の血糖値を読み解く`. The first course detail page displayed the `マイリスト済み` control, establishing the starting state before temporary removal.

The first saved course was removed through its detail-page `マイリスト済み` control and returned the `マイリストから削除しました` confirmation. The second candidate course then displayed the unsaved `マイリスト` control, so no second removal was needed before checking the real zero-save state.

After the data query settled, the authenticated My List reflected one remaining actual saved course: `健康診断の血糖値を読み解く`. This confirmed that the first detail-page removal had persisted, while the second course still required its own temporary removal before an actual zero-save state could be observed.

The last saved course displayed `マイリスト済み` after its detail page loaded and was then removed through the approved temporary operation, returning the `マイリストから削除しました` confirmation. The next My List load will validate the real 0-item state before both courses are restored.

The real authenticated My List then rendered `0 / 0講座` with no preview flag. Its sort menu, all three filter links, instructional text, `マイリストはまだ空です` heading, and `講座を探す` CTA all remained visible. This confirms the actual zero-save query path—not only the development preview—handles the toolbar and empty state correctly.

The first temporarily removed course, `続けやすい食習慣の整え方`, was then restored through its detail-page `マイリスト` control, which returned the `マイリストに追加しました` confirmation. The remaining course is restored in the next step to return the My List to its original two-item state.

The second temporarily removed course, `健康診断の血糖値を読み解く`, was likewise restored through its detail-page `マイリスト` control and returned the same successful add confirmation. The My List is therefore returned to the two-item starting state used before the real zero-save verification.

The final authenticated My List reload confirmed the restoration: the count returned to `2 / 2講座`, and both `健康診断の血糖値を読み解く` and `続けやすい食習慣の整え方` appeared as saved items. The original saved-course state was fully restored after the zero-save test.

The remaining saved item was located through the My List query and its detail route was reopened to perform the approved temporary removal. The route initially rendered its loading shell; the next verification step confirms the authenticated, loaded control state before changing it.
