import { MigrationInterface, QueryRunner } from "typeorm";
export class InitRexnet1763000000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await q.query(`CREATE TYPE block_kind AS ENUM ('REQUEST','OFFER')`);
    await q.query(
      `CREATE TYPE block_status AS ENUM ('ACTIVE','PAUSED','MATCHED','COMPLETED')`,
    );
    await q.query(
      `CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name varchar(120) NOT NULL, email varchar(254) UNIQUE NOT NULL, password_hash text NOT NULL, contact_info varchar(200) NOT NULL, is_email_verified boolean NOT NULL DEFAULT false, email_verification_token_hash text, email_verification_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE TABLE data_blocks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, pair_id uuid REFERENCES data_blocks(id) ON DELETE SET NULL, kind block_kind NOT NULL, description text NOT NULL, embedding vector(768), status block_status NOT NULL DEFAULT 'PAUSED', many_pair boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX data_blocks_lookup ON data_blocks(user_id, kind, status)`,
    );
  }
  async down(q: QueryRunner) {
    await q.query("DROP TABLE data_blocks");
    await q.query("DROP TABLE users");
    await q.query("DROP TYPE block_status");
    await q.query("DROP TYPE block_kind");
  }
}
