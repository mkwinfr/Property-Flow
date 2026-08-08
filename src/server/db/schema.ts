export const migrations = [
  {
    version: 1,
    name: "initial_domain_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL
      );

      CREATE TABLE permissions (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE role_permissions (
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_key)
      );

      CREATE TABLE properties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        address_line_1 TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'America/Chicago',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE role_assignments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, role_id, property_id)
      );

      CREATE TABLE buildings (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        UNIQUE (property_id, name)
      );

      CREATE TABLE floor_plans (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        bedrooms INTEGER NOT NULL,
        bathrooms REAL NOT NULL,
        square_feet INTEGER NOT NULL,
        UNIQUE (property_id, name)
      );

      CREATE TABLE units (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        building_id TEXT NOT NULL REFERENCES buildings(id),
        floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id),
        unit_number TEXT NOT NULL,
        floor INTEGER,
        occupancy_status TEXT NOT NULL CHECK (occupancy_status IN ('occupied', 'vacant', 'notice', 'down')),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (property_id, unit_number)
      );

      CREATE TABLE turn_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        match_bedrooms INTEGER,
        match_bathrooms REAL,
        status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE turn_template_versions (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES turn_templates(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        published_at TEXT NOT NULL,
        published_by_user_id TEXT REFERENCES users(id),
        UNIQUE (template_id, version)
      );

      CREATE TABLE turn_template_items (
        id TEXT PRIMARY KEY,
        template_version_id TEXT NOT NULL REFERENCES turn_template_versions(id) ON DELETE CASCADE,
        item_key TEXT NOT NULL,
        area TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        UNIQUE (template_version_id, item_key)
      );

      CREATE TABLE turns (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        unit_id TEXT NOT NULL REFERENCES units(id),
        template_version_id TEXT NOT NULL REFERENCES turn_template_versions(id),
        template_name_snapshot TEXT NOT NULL,
        template_version_snapshot INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'ready_for_review', 'rework', 'complete', 'cancelled')),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        move_out_date TEXT,
        target_ready_date TEXT,
        actual_ready_date TEXT,
        notes TEXT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE turn_items (
        id TEXT PRIMARY KEY,
        turn_id TEXT NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
        source_template_item_id TEXT REFERENCES turn_template_items(id),
        area TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'blocked', 'complete', 'not_applicable')),
        notes TEXT,
        assigned_to_user_id TEXT REFERENCES users(id),
        completed_by_user_id TEXT REFERENCES users(id),
        completed_at TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE activity_events (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        actor_user_id TEXT REFERENCES users(id),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_sessions_token ON sessions(token_hash);
      CREATE INDEX idx_role_assignments_user ON role_assignments(user_id, property_id);
      CREATE INDEX idx_units_property ON units(property_id, unit_number);
      CREATE INDEX idx_turns_property_status ON turns(property_id, status);
      CREATE INDEX idx_turns_unit ON turns(unit_id, created_at DESC);
      CREATE INDEX idx_turn_items_turn ON turn_items(turn_id, sort_order);
      CREATE INDEX idx_activity_entity ON activity_events(entity_type, entity_id, created_at DESC);
    `,
  },
  {
    version: 2,
    name: "operational_domains",
    sql: `
      CREATE TABLE work_orders (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        unit_id TEXT NOT NULL REFERENCES units(id),
        turn_id TEXT REFERENCES turns(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('open', 'assigned', 'in_progress', 'on_hold', 'complete', 'cancelled')),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
        requested_by TEXT,
        assigned_to_user_id TEXT REFERENCES users(id),
        due_date TEXT,
        completed_at TEXT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE appliances (
        id TEXT PRIMARY KEY,
        unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        serial_number TEXT,
        install_date TEXT,
        installer TEXT,
        warranty_expiry TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE inventory_items (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        quantity_on_hand REAL NOT NULL DEFAULT 0,
        reorder_level REAL NOT NULL DEFAULT 0,
        unit_cost REAL NOT NULL DEFAULT 0,
        supplier TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE (property_id, sku)
      );

      CREATE TABLE inventory_transactions (
        id TEXT PRIMARY KEY,
        inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
        work_order_id TEXT REFERENCES work_orders(id) ON DELETE SET NULL,
        turn_item_id TEXT REFERENCES turn_items(id) ON DELETE SET NULL,
        quantity_delta REAL NOT NULL,
        unit_cost_snapshot REAL NOT NULL,
        reason TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL
      );

      CREATE TABLE vendors (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        specialties_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
        rating REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE vendor_jobs (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL REFERENCES vendors(id),
        work_order_id TEXT REFERENCES work_orders(id) ON DELETE SET NULL,
        unit_id TEXT NOT NULL REFERENCES units(id),
        status TEXT NOT NULL CHECK (status IN ('proposed', 'scheduled', 'in_progress', 'complete', 'cancelled')),
        scope TEXT NOT NULL,
        scheduled_date TEXT,
        completed_date TEXT,
        invoice_amount REAL,
        invoice_number TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE move_out_inspections (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        unit_id TEXT NOT NULL REFERENCES units(id),
        type TEXT NOT NULL CHECK (type IN ('pre_move_out', 'final', 'other')),
        status TEXT NOT NULL CHECK (status IN ('draft', 'complete', 'locked')),
        inspection_date TEXT NOT NULL,
        inspector_user_id TEXT REFERENCES users(id),
        notes TEXT,
        generated_turn_id TEXT REFERENCES turns(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE inspection_items (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL REFERENCES move_out_inspections(id) ON DELETE CASCADE,
        template_key TEXT NOT NULL,
        room TEXT NOT NULL,
        category TEXT NOT NULL,
        label TEXT NOT NULL,
        condition TEXT NOT NULL CHECK (condition IN ('not_inspected', 'good', 'wear', 'damage', 'missing')),
        responsibility TEXT NOT NULL CHECK (responsibility IN ('owner', 'resident', 'undetermined')),
        notes TEXT,
        cost_estimate REAL,
        severity INTEGER CHECK (severity IS NULL OR severity BETWEEN 1 AND 5),
        sort_order INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (inspection_id, template_key)
      );

      CREATE TABLE inspection_charges (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL REFERENCES move_out_inspections(id) ON DELETE CASCADE,
        inspection_item_id TEXT REFERENCES inspection_items(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'removed')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE pool_logs (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        log_date TEXT NOT NULL,
        logged_at TEXT NOT NULL,
        free_chlorine REAL,
        total_chlorine REAL,
        ph REAL,
        alkalinity REAL,
        hardness REAL,
        cyanuric_acid REAL,
        water_temp_f REAL,
        weather_summary TEXT,
        notes TEXT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE attachments (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        entity_type TEXT NOT NULL CHECK (entity_type IN ('turn', 'turn_item', 'work_order', 'inspection', 'inspection_item', 'appliance')),
        entity_id TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        caption TEXT,
        uploaded_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL
      );

      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        read_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_work_orders_property_status ON work_orders(property_id, status);
      CREATE INDEX idx_work_orders_unit ON work_orders(unit_id, created_at DESC);
      CREATE INDEX idx_appliances_unit ON appliances(unit_id);
      CREATE INDEX idx_inventory_property ON inventory_items(property_id, category);
      CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(inventory_item_id, created_at DESC);
      CREATE INDEX idx_vendors_property ON vendors(property_id, status);
      CREATE INDEX idx_vendor_jobs_vendor ON vendor_jobs(vendor_id, status);
      CREATE INDEX idx_inspections_property ON move_out_inspections(property_id, inspection_date DESC);
      CREATE INDEX idx_inspection_items_inspection ON inspection_items(inspection_id, sort_order);
      CREATE INDEX idx_pool_logs_property_date ON pool_logs(property_id, log_date DESC);
      CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id, created_at DESC);
      CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);
    `,
  },
  {
    version: 3,
    name: "inventory_quantity_guards",
    sql: `
      CREATE TRIGGER inventory_items_non_negative_insert
      BEFORE INSERT ON inventory_items
      WHEN NEW.quantity_on_hand < 0 OR NEW.reorder_level < 0 OR NEW.unit_cost < 0
      BEGIN
        SELECT RAISE(ABORT, 'Inventory quantities and costs cannot be negative');
      END;

      CREATE TRIGGER inventory_items_non_negative_update
      BEFORE UPDATE OF quantity_on_hand, reorder_level, unit_cost ON inventory_items
      WHEN NEW.quantity_on_hand < 0 OR NEW.reorder_level < 0 OR NEW.unit_cost < 0
      BEGIN
        SELECT RAISE(ABORT, 'Inventory quantities and costs cannot be negative');
      END;
    `,
  },
  {
    version: 4,
    name: "property_suite_branding",
    sql: `
      UPDATE users
      SET email = CASE id
            WHEN 'user-manager' THEN 'manager@propertysuite.local'
            WHEN 'user-tech' THEN 'tech@propertysuite.local'
            WHEN 'user-leasing' THEN 'leasing@propertysuite.local'
            ELSE email
          END,
          password_hash = 'd069c3f32d26ed11730a9767cf45a855:8c824529a673c494ffa0b4951133b1b9e32ae4215f49e44301e0cfb653c0333bc16d2b8a1c971410708547e11a7fe6fe4c2bc18a5d630664c3cc91f5f33f676c',
          updated_at = CURRENT_TIMESTAMP
      WHERE id IN ('user-manager', 'user-tech', 'user-leasing');
    `,
  },
  {
    version: 5,
    name: "property_administration",
    sql: `
      INSERT OR IGNORE INTO permissions (key, label, description)
      VALUES ('properties:manage', 'Manage properties', 'Create and configure properties, buildings, floor plans, and units');

      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-manager', 'properties:manage'
      WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role-manager');

      UPDATE role_assignments
      SET property_id = NULL
      WHERE id = 'assignment-manager' AND user_id = 'user-manager' AND role_id = 'role-manager';
    `,
  },
  {
    version: 6,
    name: "property_scoped_shared_turn_scope",
    sql: `
      ALTER TABLE turn_templates ADD COLUMN property_id TEXT REFERENCES properties(id) ON DELETE CASCADE;
      ALTER TABLE turn_template_items ADD COLUMN is_required INTEGER NOT NULL DEFAULT 1 CHECK (is_required IN (0, 1));
      ALTER TABLE turn_template_items ADD COLUMN photo_recommended INTEGER NOT NULL DEFAULT 0 CHECK (photo_recommended IN (0, 1));

      ALTER TABLE move_out_inspections ADD COLUMN template_version_id TEXT REFERENCES turn_template_versions(id);
      ALTER TABLE move_out_inspections ADD COLUMN template_name_snapshot TEXT;
      ALTER TABLE move_out_inspections ADD COLUMN template_version_snapshot INTEGER;
      ALTER TABLE inspection_items ADD COLUMN source_template_item_id TEXT REFERENCES turn_template_items(id);

      ALTER TABLE turn_items ADD COLUMN source_inspection_item_id TEXT REFERENCES inspection_items(id) ON DELETE SET NULL;
      ALTER TABLE turn_items ADD COLUMN origin TEXT NOT NULL DEFAULT 'template' CHECK (origin IN ('template', 'inspection', 'make_ready'));
      ALTER TABLE turn_items ADD COLUMN inspection_condition TEXT CHECK (inspection_condition IS NULL OR inspection_condition IN ('good', 'wear', 'damage', 'missing'));
      ALTER TABLE turn_items ADD COLUMN inspection_responsibility TEXT CHECK (inspection_responsibility IS NULL OR inspection_responsibility IN ('owner', 'resident', 'undetermined'));
      ALTER TABLE turn_items ADD COLUMN inspection_cost_estimate REAL;

      INSERT INTO turn_templates
        (id, name, description, match_bedrooms, match_bathrooms, status, created_at, updated_at, property_id)
      SELECT tt.id || '-' || p.id, tt.name, tt.description, tt.match_bedrooms, tt.match_bathrooms,
             tt.status, tt.created_at, tt.updated_at, p.id
      FROM turn_templates tt CROSS JOIN properties p
      WHERE tt.property_id IS NULL;

      INSERT INTO turn_template_versions
        (id, template_id, version, published_at, published_by_user_id)
      SELECT tv.id || '-' || p.id, tv.template_id || '-' || p.id, tv.version,
             tv.published_at, tv.published_by_user_id
      FROM turn_template_versions tv CROSS JOIN properties p
      JOIN turn_templates tt ON tt.id = tv.template_id
      WHERE tt.property_id IS NULL;

      INSERT INTO turn_template_items
        (id, template_version_id, item_key, area, category, title, sort_order, is_required, photo_recommended)
      SELECT tti.id || '-' || p.id, tti.template_version_id || '-' || p.id, tti.item_key,
             tti.area, tti.category, tti.title, tti.sort_order, 1, 0
      FROM turn_template_items tti CROSS JOIN properties p
      JOIN turn_template_versions tv ON tv.id = tti.template_version_id
      JOIN turn_templates tt ON tt.id = tv.template_id
      WHERE tt.property_id IS NULL;

      UPDATE turn_items
      SET source_template_item_id = source_template_item_id || '-' ||
        (SELECT property_id FROM turns WHERE turns.id = turn_items.turn_id)
      WHERE source_template_item_id IS NOT NULL;

      UPDATE turns
      SET template_version_id = template_version_id || '-' || property_id;

      DELETE FROM turn_templates WHERE property_id IS NULL;

      CREATE INDEX idx_turn_templates_property ON turn_templates(property_id, status);
      CREATE UNIQUE INDEX idx_turn_templates_property_name ON turn_templates(property_id, name COLLATE NOCASE);
      CREATE INDEX idx_inspections_template_version ON move_out_inspections(template_version_id);
      CREATE INDEX idx_inspection_items_template_source ON inspection_items(source_template_item_id);
      CREATE INDEX idx_turn_items_inspection_source ON turn_items(source_inspection_item_id);
    `,
  },
  {
    version: 7,
    name: "make_ready_execution_controls",
    sql: `
      ALTER TABLE turns ADD COLUMN lead_technician_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE turn_items ADD COLUMN blocked_reason TEXT;
      ALTER TABLE turn_items ADD COLUMN started_at TEXT;
      ALTER TABLE vendor_jobs ADD COLUMN turn_id TEXT REFERENCES turns(id) ON DELETE SET NULL;

      CREATE INDEX idx_turns_lead_technician ON turns(lead_technician_user_id, status);
      CREATE INDEX idx_vendor_jobs_turn ON vendor_jobs(turn_id, status);
    `,
  },
  {
    version: 8,
    name: "make_ready_quality_review",
    sql: `
      ALTER TABLE turns ADD COLUMN review_round INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE turns ADD COLUMN submitted_for_review_at TEXT;
      ALTER TABLE turns ADD COLUMN approved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE turns ADD COLUMN approved_at TEXT;

      ALTER TABLE turn_items ADD COLUMN review_status TEXT
        CHECK (review_status IS NULL OR review_status IN ('pending', 'passed', 'rework'));
      ALTER TABLE turn_items ADD COLUMN review_notes TEXT;
      ALTER TABLE turn_items ADD COLUMN reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE turn_items ADD COLUMN reviewed_at TEXT;

      CREATE TABLE turn_item_reviews (
        id TEXT PRIMARY KEY,
        turn_id TEXT NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
        turn_item_id TEXT NOT NULL REFERENCES turn_items(id) ON DELETE CASCADE,
        review_round INTEGER NOT NULL,
        decision TEXT NOT NULL CHECK (decision IN ('passed', 'rework')),
        notes TEXT,
        reviewed_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_turn_item_reviews_turn_round ON turn_item_reviews(turn_id, review_round, created_at);
      CREATE INDEX idx_turn_items_review_status ON turn_items(turn_id, review_status);

      UPDATE turns
      SET review_round = 1, submitted_for_review_at = updated_at
      WHERE status = 'ready_for_review' AND review_round = 0;

      UPDATE turn_items
      SET review_status = 'pending'
      WHERE status = 'complete' AND review_status IS NULL
        AND turn_id IN (SELECT id FROM turns WHERE status = 'ready_for_review');
    `,
  },
  {
    version: 9,
    name: "turn_item_material_usage",
    sql: `
      ALTER TABLE inventory_transactions
        ADD COLUMN reverses_transaction_id TEXT REFERENCES inventory_transactions(id) ON DELETE SET NULL;

      CREATE UNIQUE INDEX idx_inventory_transactions_reversal
        ON inventory_transactions(reverses_transaction_id)
        WHERE reverses_transaction_id IS NOT NULL;
      CREATE INDEX idx_inventory_transactions_turn_item
        ON inventory_transactions(turn_item_id, created_at DESC);
    `,
  },
  {
    version: 10,
    name: "make_ready_financials_and_inventory_reorders",
    sql: `
      ALTER TABLE vendor_jobs ADD COLUMN quote_amount REAL
        CHECK (quote_amount IS NULL OR quote_amount >= 0);
      ALTER TABLE vendor_jobs ADD COLUMN approved_amount REAL
        CHECK (approved_amount IS NULL OR approved_amount >= 0);
      ALTER TABLE vendor_jobs ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'not_submitted'
        CHECK (payment_status IN ('not_submitted', 'pending_approval', 'approved', 'paid', 'disputed', 'not_applicable'));
      ALTER TABLE vendor_jobs ADD COLUMN paid_at TEXT;

      CREATE TABLE inventory_reorders (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        quantity REAL NOT NULL CHECK (quantity > 0),
        supplier TEXT,
        status TEXT NOT NULL CHECK (status IN ('requested', 'ordered', 'received', 'cancelled')),
        requested_by_user_id TEXT NOT NULL REFERENCES users(id),
        requested_at TEXT NOT NULL,
        ordered_at TEXT,
        received_at TEXT,
        received_by_user_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_inventory_reorders_property_status
        ON inventory_reorders(property_id, status, requested_at DESC);
      CREATE INDEX idx_inventory_reorders_item
        ON inventory_reorders(inventory_item_id, status, requested_at DESC);
      CREATE UNIQUE INDEX idx_inventory_reorders_one_active
        ON inventory_reorders(inventory_item_id)
        WHERE status IN ('requested', 'ordered');
    `,
  },
  {
    version: 11,
    name: "make_ready_blocker_coordination",
    sql: `
      CREATE TABLE turn_item_blockers (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        turn_id TEXT NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
        turn_item_id TEXT NOT NULL REFERENCES turn_items(id) ON DELETE CASCADE,
        category TEXT NOT NULL CHECK (category IN ('material', 'vendor', 'access', 'approval', 'scheduling', 'other')),
        reason TEXT NOT NULL,
        responsible_party TEXT,
        expected_resolution_date TEXT,
        opened_by_user_id TEXT NOT NULL REFERENCES users(id),
        opened_at TEXT NOT NULL,
        resolved_by_user_id TEXT REFERENCES users(id),
        resolved_at TEXT,
        resolution_notes TEXT
      );

      CREATE UNIQUE INDEX idx_turn_item_blockers_active
        ON turn_item_blockers(turn_item_id) WHERE resolved_at IS NULL;
      CREATE INDEX idx_turn_item_blockers_property_active
        ON turn_item_blockers(property_id, resolved_at, expected_resolution_date, opened_at);
      CREATE INDEX idx_turn_item_blockers_turn
        ON turn_item_blockers(turn_id, opened_at DESC);
    `,
  },
  {
    version: 12,
    name: "template_center",
    sql: `
      CREATE TABLE turn_template_drafts (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        template_id TEXT REFERENCES turn_templates(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        match_bedrooms INTEGER,
        match_bathrooms REAL,
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        updated_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX idx_turn_template_drafts_template ON turn_template_drafts(template_id) WHERE template_id IS NOT NULL;
      CREATE INDEX idx_turn_template_drafts_property ON turn_template_drafts(property_id, updated_at DESC);

      CREATE TABLE turn_template_draft_items (
        id TEXT PRIMARY KEY,
        draft_id TEXT NOT NULL REFERENCES turn_template_drafts(id) ON DELETE CASCADE,
        item_key TEXT NOT NULL,
        area TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        is_required INTEGER NOT NULL DEFAULT 1,
        photo_recommended INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_turn_template_draft_items_order ON turn_template_draft_items(draft_id, sort_order);

      CREATE TABLE turn_template_floor_plans (
        template_id TEXT NOT NULL REFERENCES turn_templates(id) ON DELETE CASCADE,
        floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
        PRIMARY KEY (template_id, floor_plan_id)
      );
      CREATE INDEX idx_turn_template_floor_plans_floor_plan ON turn_template_floor_plans(floor_plan_id);

      CREATE TABLE turn_template_draft_floor_plans (
        draft_id TEXT NOT NULL REFERENCES turn_template_drafts(id) ON DELETE CASCADE,
        floor_plan_id TEXT NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
        PRIMARY KEY (draft_id, floor_plan_id)
      );
    `,
  },
  {
    version: 13,
    name: "detailed_work_orders",
    sql: `
      CREATE TABLE work_order_details (
        work_order_id TEXT PRIMARY KEY REFERENCES work_orders(id) ON DELETE CASCADE,
        areas_json TEXT NOT NULL DEFAULT '[]',
        received_by_user_id TEXT REFERENCES users(id),
        permission_to_enter TEXT CHECK (permission_to_enter IS NULL OR permission_to_enter IN ('permission_given', 'no_permission')),
        appointment_required INTEGER NOT NULL DEFAULT 0 CHECK (appointment_required IN (0, 1)),
        appointment_start TEXT,
        appointment_end TEXT,
        access_notes TEXT,
        pet_information TEXT,
        security_instructions TEXT,
        vendor_work_performed INTEGER NOT NULL DEFAULT 0 CHECK (vendor_work_performed IN (0, 1)),
        vendor_id TEXT REFERENCES vendors(id),
        vendor_scope TEXT,
        vendor_scheduled_date TEXT,
        vendor_completed_date TEXT,
        vendor_invoice_number TEXT,
        vendor_cost REAL CHECK (vendor_cost IS NULL OR vendor_cost >= 0),
        resident_responsible INTEGER NOT NULL DEFAULT 0 CHECK (resident_responsible IN (0, 1)),
        resident_charge_reason TEXT,
        resident_charge_estimate REAL CHECK (resident_charge_estimate IS NULL OR resident_charge_estimate >= 0),
        resident_charge_final REAL CHECK (resident_charge_final IS NULL OR resident_charge_final >= 0),
        resident_charge_status TEXT CHECK (resident_charge_status IS NULL OR resident_charge_status IN ('pending', 'approved', 'posted', 'waived')),
        resident_charge_approved_by_user_id TEXT REFERENCES users(id),
        resident_charge_approved_at TEXT,
        completed_by_user_id TEXT REFERENCES users(id),
        completion_notes TEXT,
        work_performed TEXT,
        resident_notified INTEGER NOT NULL DEFAULT 0 CHECK (resident_notified IN (0, 1)),
        notification_method TEXT,
        follow_up_required INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_required IN (0, 1)),
        follow_up_date TEXT,
        deleted_by_user_id TEXT REFERENCES users(id),
        deleted_at TEXT,
        updated_at TEXT NOT NULL
      );

      INSERT INTO work_order_details (work_order_id, received_by_user_id, updated_at)
      SELECT id, created_by_user_id, updated_at FROM work_orders;
      CREATE INDEX idx_work_order_details_deleted ON work_order_details(deleted_at);
    `,
  },
  {
    version: 14,
    name: "financial_permissions",
    sql: `
      INSERT OR IGNORE INTO permissions (key, label, description)
      VALUES
        ('financial:view', 'View financials', 'View costs, invoices, resident charges, and vendor billing'),
        ('financial:edit', 'Edit financials', 'Update vendor billing, resident charges, and purchasing approvals'),
        ('purchasing:manage', 'Manage purchasing', 'Request, approve, and receive inventory reorders');

      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-manager', key FROM permissions
      WHERE key IN ('financial:view', 'financial:edit', 'purchasing:manage')
        AND EXISTS (SELECT 1 FROM roles WHERE id = 'role-manager');
    `,
  },
  {
    version: 15,
    name: "phase_1_1_operational_core",
    sql: `
      CREATE TABLE IF NOT EXISTS saved_views (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        module TEXT NOT NULL CHECK (module IN ('work_orders', 'turns', 'inspections', 'units')),
        name TEXT NOT NULL,
        filters_json TEXT NOT NULL DEFAULT '{}',
        sort_json TEXT NOT NULL DEFAULT '{}',
        is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views(user_id, property_id, module);

      CREATE TABLE IF NOT EXISTS recurring_jobs (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        next_run_date TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
        assigned_to_user_id TEXT REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_recurring_jobs_property ON recurring_jobs(property_id, status, next_run_date);

      CREATE TABLE IF NOT EXISTS recurring_job_runs (
        id TEXT PRIMARY KEY,
        recurring_job_id TEXT NOT NULL REFERENCES recurring_jobs(id) ON DELETE CASCADE,
        work_order_id TEXT REFERENCES work_orders(id) ON DELETE SET NULL,
        scheduled_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'generated', 'skipped')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type TEXT NOT NULL,
        channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
        enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
        PRIMARY KEY (user_id, notification_type, channel)
      );

      INSERT OR IGNORE INTO permissions (key, label, description) VALUES
        ('audit:view', 'View audit log', 'Browse property activity and audit history');

      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-manager', 'audit:view' WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role-manager');
    `,
  },
  {
    version: 16,
    name: "phase_1_2_residents_leases",
    sql: `
      CREATE TABLE IF NOT EXISTS residents (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        preferred_contact TEXT CHECK (preferred_contact IS NULL OR preferred_contact IN ('email', 'phone', 'sms')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'former', 'applicant')),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_residents_property ON residents(property_id, last_name, first_name);

      CREATE TABLE IF NOT EXISTS households (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        primary_resident_id TEXT REFERENCES residents(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS household_members (
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        resident_id TEXT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
        relationship TEXT NOT NULL DEFAULT 'member',
        is_leaseholder INTEGER NOT NULL DEFAULT 0 CHECK (is_leaseholder IN (0, 1)),
        PRIMARY KEY (household_id, resident_id)
      );

      CREATE TABLE IF NOT EXISTS leases (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        unit_id TEXT NOT NULL REFERENCES units(id),
        household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        monthly_rent REAL NOT NULL CHECK (monthly_rent >= 0),
        status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'notice', 'ended', 'cancelled')),
        move_in_date TEXT,
        move_out_date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id, status);
      CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id, status);

      INSERT OR IGNORE INTO permissions (key, label, description) VALUES
        ('residents:view', 'View residents', 'View resident and household records'),
        ('residents:manage', 'Manage residents', 'Create and update resident records'),
        ('leases:view', 'View leases', 'View lease records and occupancy'),
        ('leases:manage', 'Manage leases', 'Create and update lease records');

      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-manager', key FROM permissions
      WHERE key IN ('residents:view', 'residents:manage', 'leases:view', 'leases:manage')
        AND EXISTS (SELECT 1 FROM roles WHERE id = 'role-manager');
      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-leasing', key FROM permissions
      WHERE key IN ('residents:view', 'residents:manage', 'leases:view', 'leases:manage')
        AND EXISTS (SELECT 1 FROM roles WHERE id = 'role-leasing');
    `,
  },
  {
    version: 17,
    name: "phase_1_3_leasing_crm",
    sql: `
      CREATE TABLE IF NOT EXISTS prospects (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        source TEXT,
        stage TEXT NOT NULL DEFAULT 'inquiry' CHECK (stage IN ('inquiry', 'contacted', 'tour_scheduled', 'tour_completed', 'application', 'approved', 'leased', 'lost')),
        desired_move_in TEXT,
        budget_max REAL,
        notes TEXT,
        assigned_to_user_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_prospects_property ON prospects(property_id, stage);

      CREATE TABLE IF NOT EXISTS prospect_activities (
        id TEXT PRIMARY KEY,
        prospect_id TEXT NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
        activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'note', 'tour', 'application')),
        notes TEXT,
        scheduled_at TEXT,
        completed_at TEXT,
        actor_user_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tours (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        prospect_id TEXT NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
        unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled')),
        notes TEXT,
        guide_user_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        prospect_id TEXT NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
        unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'screening', 'approved', 'denied', 'withdrawn', 'leased')),
        submitted_at TEXT NOT NULL,
        decision_at TEXT,
        decision_notes TEXT,
        monthly_income REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT OR IGNORE INTO permissions (key, label, description) VALUES
        ('leasing:view', 'View leasing pipeline', 'View prospects, tours, and applications'),
        ('leasing:manage', 'Manage leasing pipeline', 'Update prospects, schedule tours, and process applications');

      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-manager', key FROM permissions
      WHERE key IN ('leasing:view', 'leasing:manage')
        AND EXISTS (SELECT 1 FROM roles WHERE id = 'role-manager');
      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-leasing', key FROM permissions
      WHERE key IN ('leasing:view', 'leasing:manage')
        AND EXISTS (SELECT 1 FROM roles WHERE id = 'role-leasing');
    `,
  },
  {
    version: 18,
    name: "phase_1_4_communications",
    sql: `
      CREATE TABLE IF NOT EXISTS message_templates (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
        subject TEXT,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS message_campaigns (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        template_id TEXT REFERENCES message_templates(id) ON DELETE SET NULL,
        audience_type TEXT NOT NULL CHECK (audience_type IN ('all_residents', 'active_leases', 'prospects', 'custom')),
        audience_filter_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
        scheduled_at TEXT,
        sent_at TEXT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS message_deliveries (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES message_campaigns(id) ON DELETE CASCADE,
        recipient_type TEXT NOT NULL CHECK (recipient_type IN ('resident', 'prospect', 'user')),
        recipient_id TEXT NOT NULL,
        channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
        sent_at TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL
      );

      INSERT OR IGNORE INTO permissions (key, label, description) VALUES
        ('communications:view', 'View communications', 'View message templates, campaigns, and delivery logs'),
        ('communications:manage', 'Manage communications', 'Create templates, campaigns, and send messages');

      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-manager', key FROM permissions
      WHERE key IN ('communications:view', 'communications:manage')
        AND EXISTS (SELECT 1 FROM roles WHERE id = 'role-manager');
      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-leasing', 'communications:view'
      WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role-leasing');
    `,
  },
  {
    version: 19,
    name: "phase_1_5_financial",
    sql: `
      CREATE TABLE IF NOT EXISTS resident_charges (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        resident_id TEXT REFERENCES residents(id) ON DELETE SET NULL,
        lease_id TEXT REFERENCES leases(id) ON DELETE SET NULL,
        unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount >= 0),
        charge_type TEXT NOT NULL CHECK (charge_type IN ('rent', 'fee', 'damage', 'utility', 'other')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'paid', 'waived', 'void')),
        due_date TEXT,
        posted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_resident_charges_property ON resident_charges(property_id, status, due_date);

      CREATE TABLE IF NOT EXISTS accounting_exports (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        export_type TEXT NOT NULL CHECK (export_type IN ('rent_roll', 'charges', 'vendor_costs', 'full_period')),
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
        summary_json TEXT NOT NULL DEFAULT '{}',
        row_count INTEGER NOT NULL DEFAULT 0,
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 20,
    name: "phase_1_6_scale",
    sql: `
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS property_modules (
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        module_key TEXT NOT NULL CHECK (module_key IN (
          'make_ready', 'operations', 'pool', 'residents', 'leasing',
          'communications', 'financial', 'portal'
        )),
        enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
        PRIMARY KEY (property_id, module_key)
      );

      INSERT OR IGNORE INTO permissions (key, label, description) VALUES
        ('platform:manage', 'Manage platform', 'Manage users, organizations, and platform settings');

      INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
      SELECT 'role-manager', 'platform:manage'
      WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role-manager');
    `,
  },
  {
    version: 21,
    name: "phase_2_resident_portal",
    sql: `
      CREATE TABLE IF NOT EXISTS resident_accounts (
        id TEXT PRIMARY KEY,
        resident_id TEXT NOT NULL UNIQUE REFERENCES residents(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resident_sessions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES resident_accounts(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_resident_sessions_account ON resident_sessions(account_id);
    `,
  },
  {
    version: 22,
    name: "phase_3_admin_ops",
    sql: `
      CREATE TABLE IF NOT EXISTS platform_audit_events (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON platform_audit_events(created_at DESC);
    `,
  },
  {
    version: 23,
    name: "phase_2_household_pets",
    sql: `
      CREATE TABLE IF NOT EXISTS household_pets (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        species TEXT NOT NULL,
        breed TEXT,
        color TEXT,
        weight_lbs REAL,
        is_service_animal INTEGER NOT NULL DEFAULT 0,
        vaccination_expires TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_household_pets_household ON household_pets(household_id);
    `,
  },
  {
    version: 24,
    name: "work_order_submission_source",
    sql: `
      ALTER TABLE work_orders ADD COLUMN submission_source TEXT NOT NULL DEFAULT 'staff'
        CHECK (submission_source IN ('staff', 'portal', 'recurring'));
      UPDATE work_orders SET submission_source = 'portal' WHERE requested_by = 'Resident portal';
      UPDATE work_orders SET submission_source = 'recurring' WHERE requested_by = 'Recurring maintenance';
    `,
  },
  {
    version: 25,
    name: "phase_2_portal_attachments_messages",
    sql: `
      ALTER TABLE attachments ADD COLUMN uploaded_by_resident_id TEXT REFERENCES residents(id) ON DELETE SET NULL;
      ALTER TABLE message_deliveries ADD COLUMN read_at TEXT;
      CREATE INDEX IF NOT EXISTS idx_message_deliveries_resident
        ON message_deliveries(recipient_type, recipient_id, sent_at DESC);
    `,
  },
] as const;
