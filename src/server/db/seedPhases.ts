import type Database from "better-sqlite3";
import { hashPassword } from "../lib/passwords.js";

export function seedPhaseData(db: Database.Database): void {
  const residentsTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'residents'").get();
  if (!residentsTable) return;

  const existing = db.prepare("SELECT COUNT(*) AS count FROM residents").get() as { count: number };
  if (existing.count > 0) return;

  const timestamp = new Date().toISOString();
  const propertyId = "prop-demo";

  db.transaction(() => {
    db.prepare(
      `INSERT INTO residents (id, property_id, first_name, last_name, email, phone, preferred_contact, status, notes, created_at, updated_at)
       VALUES ('res-101a', ?, 'Taylor', 'Brooks', 'taylor.brooks@example.com', '512-555-0101', 'email', 'active', NULL, ?, ?),
              ('res-101b', ?, 'Jordan', 'Brooks', 'jordan.brooks@example.com', '512-555-0102', 'phone', 'active', NULL, ?, ?),
              ('res-203a', ?, 'Casey', 'Nguyen', 'casey.nguyen@example.com', '512-555-0203', 'email', 'active', NULL, ?, ?)`,
    ).run(propertyId, timestamp, timestamp, propertyId, timestamp, timestamp, propertyId, timestamp, timestamp);

    db.prepare(
      `INSERT INTO households (id, property_id, name, primary_resident_id, created_at, updated_at)
       VALUES ('hh-101', ?, 'Brooks household', 'res-101a', ?, ?),
              ('hh-203', ?, 'Nguyen household', 'res-203a', ?, ?)`,
    ).run(propertyId, timestamp, timestamp, propertyId, timestamp, timestamp);

    db.prepare(
      `INSERT INTO household_members (household_id, resident_id, relationship, is_leaseholder) VALUES
       ('hh-101', 'res-101a', 'primary', 1), ('hh-101', 'res-101b', 'spouse', 1),
       ('hh-203', 'res-203a', 'primary', 1)`,
    ).run();

    db.prepare(
      `INSERT INTO leases (id, property_id, unit_id, household_id, start_date, end_date, monthly_rent, status, move_in_date, notes, created_at, updated_at)
       VALUES ('lease-101', ?, 'unit-101', 'hh-101', date('now', '-300 days'), date('now', '+65 days'), 1540, 'active', date('now', '-295 days'), NULL, ?, ?),
              ('lease-203', ?, 'unit-203', 'hh-203', date('now', '-180 days'), date('now', '+185 days'), 1895, 'active', date('now', '-175 days'), NULL, ?, ?)`,
    ).run(propertyId, timestamp, timestamp, propertyId, timestamp, timestamp);

    db.prepare("UPDATE work_orders SET resident_id = 'res-203a' WHERE id = 'wo-3'").run();
    db.prepare("UPDATE turns SET resident_id = 'res-101b' WHERE id = 'turn-202'").run();

    db.prepare(
      `INSERT INTO prospects (id, property_id, first_name, last_name, email, phone, source, stage, desired_move_in, budget_max, notes, assigned_to_user_id, created_at, updated_at)
       VALUES ('prospect-1', ?, 'Riley', 'Martinez', 'riley.m@example.com', '512-555-0301', 'Website', 'tour_scheduled', date('now', '+30 days'), 1700, 'Interested in B1 floor plan', 'user-leasing', ?, ?),
              ('prospect-2', ?, 'Sam', 'Patel', 'sam.p@example.com', '512-555-0302', 'Referral', 'application', date('now', '+21 days'), 2100, NULL, 'user-leasing', ?, ?)`,
    ).run(propertyId, timestamp, timestamp, propertyId, timestamp, timestamp);

    db.prepare(
      `INSERT INTO tours (id, property_id, prospect_id, unit_id, scheduled_at, status, notes, guide_user_id, created_at, updated_at)
       VALUES ('tour-1', ?, 'prospect-1', 'unit-201', datetime('now', '+2 days'), 'scheduled', 'Prefers ground floor', 'user-leasing', ?, ?)`,
    ).run(propertyId, timestamp, timestamp);

    db.prepare(
      `INSERT INTO applications (id, property_id, prospect_id, unit_id, status, submitted_at, monthly_income, created_at, updated_at)
       VALUES ('app-1', ?, 'prospect-2', 'unit-304', 'screening', datetime('now', '-3 days'), 6800, ?, ?)`,
    ).run(propertyId, timestamp, timestamp);

    db.prepare(
      `INSERT INTO message_templates (id, property_id, name, channel, subject, body, created_at, updated_at)
       VALUES ('tpl-welcome', ?, 'Move-in welcome', 'in_app', 'Welcome home', 'Welcome to Juniper Ridge. Save maintenance and office contacts in your portal.', ?, ?)`,
    ).run(propertyId, timestamp, timestamp);

    db.prepare(
      `INSERT INTO resident_charges (id, property_id, resident_id, lease_id, unit_id, description, amount, charge_type, status, due_date, created_at, updated_at)
       VALUES ('charge-rent-101', ?, 'res-101a', 'lease-101', 'unit-101', 'Monthly rent', 1540, 'rent', 'posted', date('now', 'start of month'), ?, ?),
              ('charge-fee-203', ?, 'res-203a', 'lease-203', 'unit-203', 'Late fee waiver review', 35, 'fee', 'pending', date('now', '+7 days'), ?, ?)`,
    ).run(propertyId, timestamp, timestamp, propertyId, timestamp, timestamp);

    db.prepare(
      `INSERT INTO recurring_jobs (id, property_id, unit_id, title, description, category, frequency, next_run_date, priority, assigned_to_user_id, status, created_by_user_id, created_at, updated_at)
       VALUES ('rec-hvac', ?, NULL, 'Quarterly HVAC filter change', 'Replace common-area and sampled unit filters', 'HVAC', 'quarterly', date('now', '+14 days'), 'normal', 'user-tech', 'active', 'user-manager', ?, ?)`,
    ).run(propertyId, timestamp, timestamp);
  })();
}

export function seedPortalAccounts(db: Database.Database): void {
  const accountsTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'resident_accounts'").get();
  if (!accountsTable) return;

  const existing = db.prepare("SELECT COUNT(*) AS count FROM resident_accounts").get() as { count: number };
  if (existing.count > 0) return;

  const resident = db.prepare(
    "SELECT id, email FROM residents WHERE email = 'taylor.brooks@example.com' LIMIT 1",
  ).get() as { id: string; email: string } | undefined;
  if (!resident) return;

  const timestamp = new Date().toISOString();
  const passwordHash = hashPassword("propertysuite");
  db.prepare(
    "INSERT INTO resident_accounts (id, resident_id, email, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
  ).run("portal-taylor", resident.id, resident.email, passwordHash, timestamp, timestamp);
}

export function seedHouseholdPets(db: Database.Database): void {
  const petsTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'household_pets'").get();
  if (!petsTable) return;

  const existing = db.prepare("SELECT COUNT(*) AS count FROM household_pets").get() as { count: number };
  if (existing.count > 0) return;

  const household = db.prepare("SELECT id FROM households WHERE id = 'hh-101' LIMIT 1").get() as { id: string } | undefined;
  if (!household) return;

  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO household_pets
     (id, household_id, property_id, name, species, breed, color, weight_lbs, is_service_animal, vaccination_expires, notes, created_at, updated_at)
     VALUES ('pet-brooks-1', 'hh-101', 'prop-demo', 'Mochi', 'Dog', 'Shiba Inu', 'Red', 22, 0, date('now', '+180 days'), 'Friendly; crated during maintenance visits.', ?, ?)`,
  ).run(timestamp, timestamp);
}

export function seedPortalMessages(db: Database.Database): void {
  const deliveriesTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'message_deliveries'").get();
  if (!deliveriesTable) return;

  const existing = db.prepare(
    "SELECT COUNT(*) AS count FROM message_deliveries WHERE recipient_id = 'res-101a' AND channel = 'in_app'",
  ).get() as { count: number };
  if (existing.count > 0) return;

  const template = db.prepare("SELECT id FROM message_templates WHERE id = 'tpl-welcome' LIMIT 1").get() as { id: string } | undefined;
  if (!template) return;

  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO message_campaigns
     (id, property_id, name, template_id, audience_type, audience_filter_json, status, scheduled_at, sent_at, created_by_user_id, created_at, updated_at)
     VALUES ('camp-welcome-101', 'prop-demo', 'Move-in welcome', 'tpl-welcome', 'all_residents', '{}', 'sent', NULL, ?, 'user-manager', ?, ?)`,
  ).run(timestamp, timestamp, timestamp);
  db.prepare(
    `INSERT INTO message_deliveries
     (id, campaign_id, recipient_type, recipient_id, channel, status, sent_at, created_at)
     VALUES ('msg-welcome-101', 'camp-welcome-101', 'resident', 'res-101a', 'in_app', 'sent', ?, ?)`,
  ).run(timestamp, timestamp);
}
