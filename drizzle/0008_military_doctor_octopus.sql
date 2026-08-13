DROP INDEX `learning_goal_user_idx` ON `learningGoals`;--> statement-breakpoint
ALTER TABLE `learningGoals` ADD CONSTRAINT `learning_goal_user_goal_unique` UNIQUE(`userId`,`goal`);