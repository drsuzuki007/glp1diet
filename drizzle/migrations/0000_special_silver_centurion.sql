CREATE TABLE `catalog_rows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_rows_slug_unique` ON `catalog_rows` (`slug`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `course_catalog_rows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rowId` integer NOT NULL,
	`courseId` integer NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`rowId`) REFERENCES `catalog_rows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_catalog_row_course_unique` ON `course_catalog_rows` (`rowId`,`courseId`);--> statement-breakpoint
CREATE UNIQUE INDEX `course_catalog_row_sort_unique` ON `course_catalog_rows` (`rowId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `course_catalog_row_row_idx` ON `course_catalog_rows` (`rowId`);--> statement-breakpoint
CREATE INDEX `course_catalog_row_course_idx` ON `course_catalog_rows` (`courseId`);--> statement-breakpoint
CREATE TABLE `course_reference_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`courseId` integer NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`sortOrder` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_reference_link_course_sort_unique` ON `course_reference_links` (`courseId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `course_reference_link_course_idx` ON `course_reference_links` (`courseId`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`categoryId` integer NOT NULL,
	`doctorId` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`intendedFor` text NOT NULL,
	`learningPoints` text NOT NULL,
	`referencesText` text NOT NULL,
	`coiText` text NOT NULL,
	`price` integer NOT NULL,
	`durationMinutes` integer NOT NULL,
	`publishedAt` integer NOT NULL,
	`reviewedAt` integer NOT NULL,
	`thumbnailTheme` text DEFAULT 'cyan' NOT NULL,
	`previewLabel` text NOT NULL,
	`vimeoId` text,
	`isFeatured` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`specialty` text NOT NULL,
	`profile` text NOT NULL,
	`affiliation` text NOT NULL,
	`initials` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doctors_slug_unique` ON `doctors` (`slug`);--> statement-breakpoint
CREATE TABLE `learningActivities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`courseId` integer NOT NULL,
	`watchedSeconds` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`recordedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `learning_activity_user_recorded_idx` ON `learningActivities` (`userId`,`recordedAt`);--> statement-breakpoint
CREATE TABLE `learningGoals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`goal` text NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_goal_user_goal_unique` ON `learningGoals` (`userId`,`goal`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`courseId` integer NOT NULL,
	`priceAtPurchase` integer NOT NULL,
	`status` text DEFAULT 'purchased' NOT NULL,
	`purchasedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_user_course_unique` ON `purchases` (`userId`,`courseId`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`status` text DEFAULT 'incomplete' NOT NULL,
	`stripeSubscriptionId` text,
	`stripeEventCreatedAt` integer,
	`currentPeriodEnd` integer,
	`cancelAtPeriodEnd` integer DEFAULT false NOT NULL,
	`plan` text DEFAULT 'standard' NOT NULL,
	`monthlyPrice` integer DEFAULT 980 NOT NULL,
	`startedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`renewedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripeSubscriptionId_unique` ON `subscriptions` (`stripeSubscriptionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_user_unique` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE TABLE `team_code_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`attemptCount` integer DEFAULT 0 NOT NULL,
	`windowStartedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_code_attempts_userId_unique` ON `team_code_attempts` (`userId`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teamId` integer NOT NULL,
	`userId` integer NOT NULL,
	`joinedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_team_user_unique` ON `team_members` (`teamId`,`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_user_unique` ON `team_members` (`userId`);--> statement-breakpoint
CREATE INDEX `team_member_team_idx` ON `team_members` (`teamId`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teamName` text NOT NULL,
	`adminEmail` text NOT NULL,
	`stripeCustomerId` text NOT NULL,
	`stripeSubscriptionId` text NOT NULL,
	`seatCount` integer NOT NULL,
	`accessCode` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_stripeSubscriptionId_unique` ON `teams` (`stripeSubscriptionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_accessCode_unique` ON `teams` (`accessCode`);--> statement-breakpoint
CREATE INDEX `team_admin_email_idx` ON `teams` (`adminEmail`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_stripe_customer_unique` ON `teams` (`stripeCustomerId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`stripeCustomerId` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`subscriptionStatus` text DEFAULT 'incomplete' NOT NULL,
	`currentPeriodEnd` integer,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSignedIn` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_stripeCustomerId_unique` ON `users` (`stripeCustomerId`);--> statement-breakpoint
CREATE TABLE `viewingProgress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`courseId` integer NOT NULL,
	`progressPercent` integer DEFAULT 0 NOT NULL,
	`lastPositionSeconds` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `progress_user_course_unique` ON `viewingProgress` (`userId`,`courseId`);--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`courseId` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_user_course_unique` ON `wishlists` (`userId`,`courseId`);