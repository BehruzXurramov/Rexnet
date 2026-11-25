import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { User, DataBlock } from "./entities";
export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production" ||
    process.env.DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  entities: [User, DataBlock],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: false,
});
