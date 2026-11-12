CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('customer', 'employee', 'owner')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE theatres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    city VARCHAR(100) NOT NULL,
	phone_number VARCHAR(30),
	address VARCHAR(100) NOT NULL
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    theatre_id INTEGER NOT NULL REFERENCES theatres(id),
    capacity INTEGER NOT NULL,
    wheelchair_capacity INTEGER DEFAULT (10)
);


CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    row_number INTEGER NOT NULL CHECK (row_number <> 13),
    seat_number INTEGER NOT NULL CHECK (seat_number <> 13),
    column_position INTEGER NOT NULL,
    is_client_reserved BOOLEAN DEFAULT FALSE,
    UNIQUE (room_id, row_number, seat_number)
);

CREATE TABLE movies (
	id SERIAL PRIMARY KEY,
	title VARCHAR(50) NOT NULL,
	duration_minutes INTEGER NOT NULL DEFAULT 60,
	trailer_url TEXT,
	image_url TEXT,
	description TEXT,
	age_rating VARCHAR(20)
);

CREATE TABLE showtimes (
	id SERIAL PRIMARY KEY,
	movie_id INTEGER NOT NULL REFERENCES movies(id),
	room_id INTEGER NOT NULL REFERENCES rooms(id),
	start_time TIMESTAMP NOT NULL,
	ticket_price DECIMAL(10,2) NOT NULL CHECK (ticket_price >= 0),
	first_screening BOOLEAN DEFAULT FALSE
);

CREATE TABLE reservations (
	id SERIAL PRIMARY KEY,
	user_id INTEGER REFERENCES users(id),
	customer_name VARCHAR(100) NOT NULL,
	customer_email VARCHAR(100) NOT NULL,
	showtime_id INTEGER NOT NULL REFERENCES showtimes(id),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	expires_at TIMESTAMP,
	total_price DECIMAL(10,2)
);

CREATE TABLE reservation_seats (
	id SERIAL PRIMARY KEY,
	reservation_id INTEGER NOT NULL REFERENCES reservations(id),
	seat_id INTEGER NOT NULL REFERENCES seats(id),
	UNIQUE (reservation_id, seat_id)
);

CREATE TABLE tickets (
	id SERIAL PRIMARY KEY,
	reservation_id INTEGER REFERENCES reservations(id),
	seat_id INTEGER NOT NULL REFERENCES seats(id),
	purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	child_discount BOOLEAN DEFAULT FALSE,
	tenth_ticket_discount BOOLEAN DEFAULT FALSE,
	UNIQUE (reservation_id, seat_id)
);

-- TODO: waiting list, company reservations

--placeholder movie for testing
INSERT INTO movies (
    title,
    duration_minutes,
    image_url,
    description,
    age_rating
) VALUES (
    'Placeholder Movie',
    120,
    'https://upload.wikimedia.org/wikipedia/fi/8/84/Oppenheimer-poster.jpg?utm_source=fi.wikipedia.org&utm_campaign=index&utm_content=original',
    'Movie details will appear here.',
    'PG-13'
);

--placeholder showtime for testing
INSERT INTO showtimes (
    movie_id,
    room_id,
    start_time,
    ticket_price,
    first_screening
) VALUES (
    1,
    2,
    '2025-01-01 19:00:00',
    16.90,
    FALSE
);