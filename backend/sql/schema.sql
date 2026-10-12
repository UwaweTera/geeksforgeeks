CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'instructor', 'admin') NOT NULL DEFAULT 'student',
  bio TEXT,
  country VARCHAR(80) DEFAULT '',
  university VARCHAR(160) DEFAULT '',
  education VARCHAR(80) DEFAULT '',
  skill_level VARCHAR(40) DEFAULT 'Beginner',
  interests JSON,
  github VARCHAR(120) DEFAULT '',
  linkedin VARCHAR(160) DEFAULT '',
  website VARCHAR(160) DEFAULT '',
  google_sub VARCHAR(128) DEFAULT NULL,
  two_factor TINYINT(1) DEFAULT 0,
  email_verified TINYINT(1) DEFAULT 0,
  xp INT DEFAULT 0,
  streak INT DEFAULT 0,
  last_potd DATE NULL,
  created_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(160) UNIQUE,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  rating DECIMAL(3,1) DEFAULT 0,
  level VARCHAR(80),
  interested VARCHAR(40),
  tag VARCHAR(40),
  live TINYINT(1) DEFAULT 1,
  color VARCHAR(80),
  accent VARCHAR(40),
  icon VARCHAR(40),
  description TEXT,
  blurb TEXT,
  price VARCHAR(40),
  old_price VARCHAR(40),
  seats VARCHAR(80),
  weeks VARCHAR(40),
  offer_percent INT DEFAULT 0,
  modules JSON
);

CREATE TABLE IF NOT EXISTS articles (
  slug VARCHAR(160) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(80),
  tags JSON,
  difficulty VARCHAR(20),
  minutes INT,
  published DATE,
  updated DATE,
  excerpt TEXT,
  body JSON
);

CREATE TABLE IF NOT EXISTS problems (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  difficulty VARCHAR(20),
  topic VARCHAR(80),
  companies JSON,
  accuracy INT,
  submissions INT,
  prompt TEXT,
  examples JSON,
  constraints_json JSON,
  starter JSON,
  tests JSON
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  audience VARCHAR(160),
  steps JSON
);

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  company VARCHAR(160),
  location VARCHAR(160),
  type VARCHAR(40),
  level VARCHAR(40),
  salary VARCHAR(80),
  skills JSON,
  remote TINYINT(1) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contests (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  starts VARCHAR(80),
  duration VARCHAR(40),
  problems INT,
  registered INT,
  status VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS companies (
  slug VARCHAR(80) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  roles JSON,
  topics JSON,
  questions JSON
);

CREATE TABLE IF NOT EXISTS enrollments (
  user_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress',
  progress INT DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_method VARCHAR(40) DEFAULT '',
  amount VARCHAR(40) DEFAULT '',
  paid_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, course_id),
  INDEX idx_enroll_course (course_id)
);

CREATE TABLE IF NOT EXISTS course_payments (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  amount VARCHAR(40) NOT NULL,
  method VARCHAR(40) NOT NULL,
  status VARCHAR(20) DEFAULT 'paid',
  card_last4 VARCHAR(8) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pay_user (user_id),
  INDEX idx_pay_course (course_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(160) NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  problem_id VARCHAR(64) NOT NULL,
  language VARCHAR(40),
  status VARCHAR(40),
  runtime VARCHAR(40),
  memory VARCHAR(40),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sub_user (user_id),
  INDEX idx_sub_problem (problem_id)
);

CREATE TABLE IF NOT EXISTS problem_progress (
  user_id VARCHAR(64) NOT NULL,
  problem_id VARCHAR(64) NOT NULL,
  solved TINYINT(1) DEFAULT 0,
  attempted TINYINT(1) DEFAULT 1,
  PRIMARY KEY (user_id, problem_id)
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  email VARCHAR(200) PRIMARY KEY,
  otp VARCHAR(12) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skillup_leads (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(80) DEFAULT '',
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(160) NOT NULL,
  graduation_year VARCHAR(8) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  lesson_id VARCHAR(160) NOT NULL,
  completed TINYINT(1) DEFAULT 1,
  score INT DEFAULT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, course_id, lesson_id),
  INDEX idx_lp_course (course_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  lesson_id VARCHAR(160) NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  score INT NOT NULL,
  passed TINYINT(1) DEFAULT 0,
  answers JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qa_user (user_id, course_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(80) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  student_name VARCHAR(160) NOT NULL,
  course_title VARCHAR(255) NOT NULL,
  issued_at DATE NOT NULL,
  UNIQUE KEY uniq_user_course (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS study_alerts (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  course_id VARCHAR(64) DEFAULT NULL,
  channel VARCHAR(20) DEFAULT 'inapp',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  INDEX idx_alerts_user (user_id, created_at)
);
