CREATE TABLE `expense` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`year` int NOT NULL,
	`category` enum('health','education') NOT NULL,
	`description` varchar(255) NOT NULL,
	`beneficiary` varchar(120) NOT NULL,
	`date` date NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `expense_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `expense` ADD CONSTRAINT `expense_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `expense_user_year_idx` ON `expense` (`user_id`,`year`);