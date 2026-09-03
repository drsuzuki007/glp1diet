CREATE TABLE `learningGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`goal` enum('understand_glp1','improve_lifestyle','understand_checks','prepare_for_visit') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningGoals_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_goal_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `learningGoals` ADD CONSTRAINT `learningGoals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;