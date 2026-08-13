ALTER TABLE `learningGoals` DROP INDEX `learning_goal_user_unique`;--> statement-breakpoint
CREATE INDEX `learning_goal_user_idx` ON `learningGoals` (`userId`);
--> statement-breakpoint
ALTER TABLE `learningGoals` DROP INDEX `learning_goal_user_unique`;
