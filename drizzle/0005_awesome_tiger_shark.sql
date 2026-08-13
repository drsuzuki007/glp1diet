CREATE TABLE `learningActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`watchedSeconds` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learningActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `learningActivities` ADD CONSTRAINT `learningActivities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learningActivities` ADD CONSTRAINT `learningActivities_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `learning_activity_user_recorded_idx` ON `learningActivities` (`userId`,`recordedAt`);