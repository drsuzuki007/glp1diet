CREATE TABLE `catalog_rows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(220) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_rows_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_rows_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `course_catalog_rows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rowId` int NOT NULL,
	`courseId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `course_catalog_rows_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_catalog_row_course_unique` UNIQUE(`rowId`,`courseId`),
	CONSTRAINT `course_catalog_row_sort_unique` UNIQUE(`rowId`,`sortOrder`)
);
--> statement-breakpoint
ALTER TABLE `course_catalog_rows` ADD CONSTRAINT `course_catalog_rows_rowId_catalog_rows_id_fk` FOREIGN KEY (`rowId`) REFERENCES `catalog_rows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_catalog_rows` ADD CONSTRAINT `course_catalog_rows_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `course_catalog_row_row_idx` ON `course_catalog_rows` (`rowId`);--> statement-breakpoint
CREATE INDEX `course_catalog_row_course_idx` ON `course_catalog_rows` (`courseId`);