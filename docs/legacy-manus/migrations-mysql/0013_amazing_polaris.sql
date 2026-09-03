CREATE TABLE `team_code_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`attemptCount` int NOT NULL DEFAULT 0,
	`windowStartedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_code_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_code_attempts_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_member_team_user_unique` UNIQUE(`teamId`,`userId`),
	CONSTRAINT `team_member_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamName` varchar(180) NOT NULL,
	`adminEmail` varchar(320) NOT NULL,
	`stripeCustomerId` varchar(255) NOT NULL,
	`stripeSubscriptionId` varchar(255) NOT NULL,
	`seatCount` int NOT NULL,
	`accessCode` varchar(32) NOT NULL,
	`status` enum('active','canceled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`),
	CONSTRAINT `teams_accessCode_unique` UNIQUE(`accessCode`),
	CONSTRAINT `team_stripe_customer_unique` UNIQUE(`stripeCustomerId`)
);
--> statement-breakpoint
ALTER TABLE `courses` ADD `vimeoId` varchar(40);--> statement-breakpoint
ALTER TABLE `team_code_attempts` ADD CONSTRAINT `team_code_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `team_member_team_idx` ON `team_members` (`teamId`);--> statement-breakpoint
CREATE INDEX `team_admin_email_idx` ON `teams` (`adminEmail`);