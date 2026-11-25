import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { User, DataBlock } from "./entities";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthGuard } from "./auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: "postgres",
        url: process.env.DATABASE_URL,
        ssl:
          process.env.NODE_ENV === "production" ||
          process.env.DATABASE_URL?.includes("neon.tech")
            ? { rejectUnauthorized: false }
            : false,
        entities: [User, DataBlock],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([User, DataBlock]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "development-secret",
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as any },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AuthGuard],
  exports: [AuthGuard],
})
export class AppModule {}
