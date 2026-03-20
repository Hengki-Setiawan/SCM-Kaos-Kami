CREATE TABLE `telegram_users` (
	`id` text PRIMARY KEY NOT NULL,
	`telegram_id` text NOT NULL,
	`username` text,
	`first_name` text,
	`role` text DEFAULT 'staff' NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_users_telegram_id_unique` ON `telegram_users` (`telegram_id`);--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `undo_token` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `can_be_undone` integer DEFAULT false;