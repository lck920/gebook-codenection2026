-- Business schema for the trip planner. Amounts are integer minor units (JPY
-- has no sub-unit, so the integer is the yen value).

CREATE TABLE IF NOT EXISTS trips (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  start_date  text NOT NULL,
  end_date    text NOT NULL,
  status      text NOT NULL,
  currency    text NOT NULL DEFAULT 'JPY',
  cover_color text NOT NULL DEFAULT '#3f6fc9',
  owner_id    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_members (
  id              text PRIMARY KEY,
  trip_id         text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name            text NOT NULL,
  short_name      text NOT NULL,
  initials        text NOT NULL,
  avatar_bg       text NOT NULL,
  avatar_fg       text NOT NULL,
  is_current_user boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS trip_members_trip_idx ON trip_members(trip_id);

CREATE TABLE IF NOT EXISTS trip_days (
  trip_id    text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  number     integer NOT NULL,
  date       text NOT NULL DEFAULT '',
  date_label text NOT NULL,
  city       text NOT NULL,
  color      text NOT NULL,
  PRIMARY KEY (trip_id, number)
);

CREATE TABLE IF NOT EXISTS stops (
  id         text PRIMARY KEY,
  trip_id    text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day        integer NOT NULL,
  time       text NOT NULL,
  duration   text NOT NULL,
  name       text NOT NULL,
  area       text NOT NULL,
  category   text NOT NULL,
  lat        double precision NOT NULL,
  lng        double precision NOT NULL,
  cost       integer NOT NULL DEFAULT 0,
  created_by text NOT NULL,
  transit    boolean NOT NULL DEFAULT false,
  note       text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS stops_trip_idx ON stops(trip_id);

CREATE TABLE IF NOT EXISTS stop_votes (
  stop_id   text NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  member_id text NOT NULL,
  PRIMARY KEY (stop_id, member_id)
);

CREATE TABLE IF NOT EXISTS stop_comments (
  id         bigserial PRIMARY KEY,
  stop_id    text NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  author_id  text NOT NULL,
  text       text NOT NULL,
  time_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stop_comments_stop_idx ON stop_comments(stop_id);

CREATE TABLE IF NOT EXISTS expenses (
  id          text PRIMARY KEY,
  trip_id     text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description text NOT NULL,
  payer_id    text NOT NULL,
  amount      integer NOT NULL,
  when_label  text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS expenses_trip_idx ON expenses(trip_id);

CREATE TABLE IF NOT EXISTS expense_participants (
  expense_id text NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id  text NOT NULL,
  PRIMARY KEY (expense_id, member_id)
);
