CREATE TABLE `monthly_entry` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`income` decimal(12,2) NOT NULL,
	`official_pension` decimal(12,2) NOT NULL DEFAULT 0,
	`dependents` int NOT NULL DEFAULT 0,
	`alimony` decimal(12,2) NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `monthly_entry_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthly_entry_user_period_unique` UNIQUE(`user_id`,`year`,`month`)
);
--> statement-breakpoint
CREATE TABLE `other_deduction` (
	`id` varchar(36) NOT NULL,
	`entry_id` varchar(36) NOT NULL,
	`type` enum('private_pension','funpresp','fapi','livro_caixa') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	CONSTRAINT `other_deduction_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `monthly_entry` ADD CONSTRAINT `monthly_entry_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `other_deduction` ADD CONSTRAINT `other_deduction_entry_id_monthly_entry_id_fk` FOREIGN KEY (`entry_id`) REFERENCES `monthly_entry`(`id`) ON DELETE cascade ON UPDATE no action;