# Learning Goal Priority Verification

The authenticated My Page shows the selected lifestyle goal with a `優先度 1` badge, displays up/down priority controls, and uses `優先度1` in the reason for goal-aligned recommendations. The in-progress lesson remains first, while lifestyle courses follow as the highest-priority thematic recommendations.

After reload, the lifestyle goal remained at priority 1 and the GLP-1 basics goal remained at priority 2. The recommendation list kept the in-progress lesson first, then placed a lifestyle course before a GLP-1 course; each goal-aligned reason displayed its corresponding priority.

The goal API stored both selected goals and returned their persisted priorities. After changing the order to GLP-1 basics first and reloading, the GLP-1 goal displayed as priority 1, the lifestyle goal as priority 2, and their aligned recommendations appeared in the same priority order after the in-progress lesson.

The priority-down control was then used for the GLP-1 goal. After the page reloaded, lifestyle returned as priority 1 and GLP-1 basics as priority 2; the goal-aligned recommendations followed the same updated order. The controls now use a separate pending state from the add/remove controls so a completed or pending goal-selection request does not unnecessarily lock goal reordering.

With the separated pending states applied, the browser priority-up control for the GLP-1 goal restored it to priority 1 after reload. The reciprocal lifestyle goal moved to priority 2, and the goal-aligned recommendation cards changed to the same order. The first and final priority positions correctly disable only the unavailable direction.

Using the visible browser controls, moving GLP-1 basics down produced a successful `learningGoal.reorder` response, changed lifestyle to priority 1, and updated the recommendation order with the on-screen message `優先順位を保存しました`. Moving GLP-1 basics up again restored it to priority 1; a subsequent page reload retained both the saved priority labels and the GLP-1-first recommendation order. At each boundary, the unavailable arrow was visibly muted while the valid direction remained available.
