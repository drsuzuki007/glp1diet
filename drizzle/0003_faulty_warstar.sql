ALTER TABLE `subscriptions` MODIFY COLUMN `status` enum('active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused') NOT NULL DEFAULT 'incomplete';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currentPeriodEnd` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cancelAtPeriodEnd` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_stripeCustomerId_unique` UNIQUE(`stripeCustomerId`);
--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `status` enum('active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused') NOT NULL DEFAULT 'incomplete';
