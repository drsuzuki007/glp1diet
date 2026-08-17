ALTER TABLE `subscriptions` ADD `plan` enum('standard') DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('free','standard','premium') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused') DEFAULT 'incomplete' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `currentPeriodEnd` timestamp;
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `plan` enum('standard') DEFAULT 'standard' NOT NULL;
