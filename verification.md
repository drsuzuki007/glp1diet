# Verification Notes

Public-page verification confirmed that the catalog initializes its own seed data and displays 10 independently authored course records. The detail route for `glp1-foundations` rendered the course metadata, educational disclaimer, instructor profile, purchase call to action, and free-preview trigger.

The free preview opens an HTML5 video player using the project-hosted asset. Browser verification reported a ready state of 4, a duration of 8 seconds, and active playback. The purchased-learning player uses the same playable asset in this demonstration build and records the actual `currentTime` together with a calculated percentage when the learner saves progress.

The authenticated purchase, wishlist, and saved-progress views require a real Manus OAuth session; the unauthenticated my-page state was rendered and verified without initiating a login on behalf of the user.

The browser now has an authenticated Manus OAuth session for the project owner. The application header correctly switched to the logged-in state and exposes the logout control, so the remaining protected-flow verification can proceed against the saved user data.

With the authenticated session, the `food-habits` course was added to the wishlist. The UI reported `マイリストに追加しました`, confirming the protected wishlist mutation completed successfully.

The same course proceeded through the explicit mock checkout. The confirmation dialog declared that no payment, card transmission, or monetary movement would occur; completion returned `デモ購入が完了しました。視聴を開始できます。`, confirming the protected purchase mutation persisted the demo purchase state.

After the purchase, both course-level calls to action changed to `視聴を開始する`. The purchased-learning player opened successfully, played the project-hosted video, and displayed live progress derived from playback time.

The player saved the current playback position through the protected progress mutation. After the save completed, the control returned from `保存中…` to `現在の視聴位置を保存する`, and the player retained a non-zero viewing percentage. The following my-page check validates that this saved state is read back from the database.

The authenticated browser then navigated to the purchases tab. The first capture showed its normal loading state with zero-valued counters before the protected library query completed; the subsequent settled-state check is used for the persisted-data result.

Once settled, the my page showed one wishlist item, one purchase, and one in-progress course. The purchase tab contained `続けやすい食習慣の整え方` with its demo purchase date and price. The progress tab showed the same course at 10%, confirming the persisted wishlist, purchase, and playback-state data are read back into the corresponding tabs.

After the subscription migration, the `glp1-foundations` detail page displayed the glp1.diet identity and a single `月額¥980で加入` call to action. The course sidebar now states `全講座見放題 ¥980（税込）/ 月`; individual course prices and single-course checkout wording are absent from the detail flow.

In an authenticated session, the month-to-month enrollment dialog showed a single monthly total of ¥980 and explicitly stated that the current operation is a no-charge demo. The protected activation request was started from this confirmation state; the settled-state check follows after the server response.

The activation completed successfully: course-level calls to action changed from joining to `視聴を開始する` and `この講座を視聴する`. The settled my-page content reported `ACTIVE SUBSCRIPTION` and `加入中`, confirming that a single subscription grants access without individual course purchases.

The subscription was also applied to a different course, `heart-kidney-health`, whose detail page offered `視聴を開始する` and `この講座を視聴する` without a second enrollment prompt. The shared header now uses `加入状況` in place of the retired purchase-history navigation label.

For that second course, the protected learning player opened and returned a video ready state of 4, an 8-second duration, a non-zero playback position, and `paused: false`. This verifies that the active subscription permits actual player playback for a course that was not individually purchased.

The second course's progress-save control completed and returned to `現在の視聴位置を保存する` with a non-zero progress percentage displayed in the active player. This confirms that progress persistence is permitted by the subscription access path.

Stripe Sandbox Checkout created a monthly `glp1.diet 全講座見放題` subscription for ¥980, using Stripe's hosted card form and the approved `4242 4242 4242 4242` test card. After completion, the app returned to `/mypage?checkout=success` and displayed the authenticated `請求・解約を管理` control, confirming that the Stripe Checkout completion and webhook-driven entitlement update activated the account.

The Stripe Billing Portal session URL was generated successfully for the active Stripe customer. Returning to a course detail page after the test payment displayed `視聴を開始する` and `この講座を視聴する`, confirming that Stripe-backed entitlement permits the protected learning flow.

The protected player opened after the Stripe test subscription and reported a video ready state of 4, an 8-second duration, a non-zero playback position, and `paused: false`. This confirms that the actual Stripe-backed subscription is applied to the playback entitlement, not only to the page label.

The Stripe Sandbox Billing Portal completed the approved period-end cancellation reservation. Stripe displayed `Cancels Sep 13` and confirmed that service remains available through September 13, 2026, while offering a `Don't cancel subscription` reactivation option. This verifies the expected rule: cancellation stops renewal while retaining access through the paid period.

After the cancellation event, the app refreshed the Stripe subscription on return from the Billing Portal. The My Page banner now displays `解約予定のサブスクリプション` and `解約予定日：2026/9/13。この日までは全講座を視聴できます。`, confirming item-level period-end extraction, scheduled-cancellation recognition, and entitlement retention through the paid period.

Following the scheduled cancellation, a separate course detail route still displayed `視聴を開始する` and `この講座を視聴する`. This confirms that period-end cancellation continues to grant all-course playback access through the stored subscription end date.

After adding Stripe event-time protection, returning with `billing=updated` again synchronized the current subscription without losing the scheduled cancellation. The completed My Page view continued to show the September 13, 2026 cancellation date and all-course access through that date.
