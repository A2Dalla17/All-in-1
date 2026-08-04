-- Recurring rides table for scheduled/repeating rides
CREATE TABLE IF NOT EXISTS recurring_rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,

    -- Route (stored as JSONB for lat/lng pairs)
    pickup_location JSONB NOT NULL,
    dropoff_location JSONB NOT NULL,
    pickup_address VARCHAR(500),
    dropoff_address VARCHAR(500),

    -- Ride preferences
    ride_type VARCHAR(50) NOT NULL,
    notes TEXT,

    -- Schedule
    recurrence_pattern VARCHAR(20) NOT NULL CHECK (recurrence_pattern IN ('daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'monthly', 'custom')),
    days_of_week JSONB DEFAULT '[]',
    scheduled_time VARCHAR(5) NOT NULL,  -- "08:30" HH:MM
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',

    -- Date range
    start_date DATE NOT NULL,
    end_date DATE,
    max_occurrences INTEGER,
    occurrence_count INTEGER NOT NULL DEFAULT 0,

    -- Pricing
    price_lock_enabled BOOLEAN NOT NULL DEFAULT false,
    locked_price DECIMAL(10,2),
    price_lock_expiry TIMESTAMPTZ,

    -- Driver preference
    preferred_driver_id UUID REFERENCES drivers(id),
    same_driver_enabled BOOLEAN NOT NULL DEFAULT false,
    last_driver_id UUID REFERENCES drivers(id),

    -- Notifications
    reminder_minutes INTEGER NOT NULL DEFAULT 30,
    notify_on_booking BOOLEAN NOT NULL DEFAULT true,
    notify_on_cancel BOOLEAN NOT NULL DEFAULT true,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    last_scheduled_at TIMESTAMPTZ,
    next_scheduled_at TIMESTAMPTZ,

    -- Corporate
    corporate_account_id UUID,
    cost_center VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled ride instances (individual occurrences of a recurring ride)
CREATE TABLE IF NOT EXISTS scheduled_ride_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_ride_id UUID NOT NULL REFERENCES recurring_rides(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ride_id UUID REFERENCES rides(id),  -- Links to actual ride when booked

    -- Scheduled details
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(5) NOT NULL,
    pickup_at TIMESTAMPTZ NOT NULL,

    -- Route (copied from recurring ride, can be overridden)
    pickup_location JSONB NOT NULL,
    dropoff_location JSONB NOT NULL,
    pickup_address VARCHAR(500),
    dropoff_address VARCHAR(500),

    -- Pricing
    estimated_fare DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_fare DECIMAL(10,2),
    price_locked BOOLEAN NOT NULL DEFAULT false,

    -- Driver
    driver_id UUID REFERENCES drivers(id),
    driver_assigned_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'skipped', 'failed')),
    status_reason TEXT,

    -- Timing
    reminder_sent_at TIMESTAMPTZ,
    booked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recurring_rides_rider ON recurring_rides(rider_id);
CREATE INDEX idx_recurring_rides_status ON recurring_rides(status);
CREATE INDEX idx_recurring_rides_next ON recurring_rides(next_scheduled_at) WHERE status = 'active';
CREATE INDEX idx_ride_instances_recurring ON scheduled_ride_instances(recurring_ride_id);
CREATE INDEX idx_ride_instances_rider ON scheduled_ride_instances(rider_id);
CREATE INDEX idx_ride_instances_status ON scheduled_ride_instances(status);
CREATE INDEX idx_ride_instances_pickup ON scheduled_ride_instances(pickup_at) WHERE status = 'scheduled';
