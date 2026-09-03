CREATE TABLE `course_reference_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`label` varchar(180) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `course_reference_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_reference_link_course_sort_unique` UNIQUE(`courseId`,`sortOrder`)
);
--> statement-breakpoint
ALTER TABLE `course_reference_links` ADD CONSTRAINT `course_reference_links_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `course_reference_link_course_idx` ON `course_reference_links` (`courseId`);