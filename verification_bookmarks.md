# Recommendation Bookmark Verification

In the authenticated, cancellation-scheduled subscription state, the recommendation panel displayed a separate `後で見る` button for each of its three suggested courses.

Saving the recommended GLP-1 course 「薬物療法を理解するための視点」 changed its button to `保存済み`, increased the My List tab count from 2 to 3, and immediately added the same course to the My List content. The result demonstrates that the recommendation card uses the existing wishlist persistence and the library query is refreshed after a successful mutation.

Clicking the saved recommendation again produced the `後で見るから削除しました。` confirmation. A full page reload then restored the card to `後で見る`, returned the My List count to 2, and removed the course from the list, confirming server-side removal persistence.

The recommendation state now applies an optimistic in-page update with rollback support. Saving the same course again immediately restored `保存済み`, increased the My List count to 3, and added the course back into the list. A further full reload retained the saved state, confirming that the displayed state, server persistence, and list synchronization stay aligned.

After that persisted-save check, removing the same card immediately returned its action to `後で見る`, reduced the My List count to 2, and removed it from the visible list in the same page view. The `recommendation wishlist helpers` test now covers the saved initial state, the save/remove state cycle, and the persisted state supplied to recommendation cards after a reload.

The removal state was then reloaded directly from the application route. The recommendation action remained `後で見る`; the My List count remained 2, and the removed course remained absent from the list. This verifies both halves of the persistence cycle: save/reload restores `保存済み`, while remove/reload restores the unsaved state.
