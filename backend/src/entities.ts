import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum BlockKind {
  REQUEST = "REQUEST",
  OFFER = "OFFER",
}
export enum BlockStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  MATCHED = "MATCHED",
  COMPLETED = "COMPLETED",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "full_name", length: 120 }) fullName!: string;
  @Index({ unique: true }) @Column({ length: 254 }) email!: string;
  @Column({ name: "password_hash" }) passwordHash!: string;
  @Column({ name: "contact_info", length: 200 }) contactInfo!: string;
  @Column({ name: "is_email_verified", default: false })
  isEmailVerified!: boolean;
  @Column({
    name: "email_verification_token_hash",
    type: "varchar",
    nullable: true,
  })
  verificationTokenHash!: string | null;
  @Column({
    name: "email_verification_expires_at",
    nullable: true,
    type: "timestamptz",
  })
  verificationExpiresAt!: Date | null;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("data_blocks")
@Index(["userId", "kind", "status"])
export class DataBlock {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "user_id", type: "uuid" }) userId!: string;
  @Column({ name: "pair_id", type: "uuid", nullable: true }) pairId!:
    | string
    | null;
  @Column({ type: "enum", enum: BlockKind }) kind!: BlockKind;
  @Column({ type: "text" }) description!: string;
  @Column({ type: "vector", length: 768, nullable: true }) embedding!:
    | number[]
    | null;
  @Column({ type: "enum", enum: BlockStatus, default: BlockStatus.PAUSED })
  status!: BlockStatus;
  @Column({ name: "many_pair", default: false })
  allowsMultipleMatches!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
