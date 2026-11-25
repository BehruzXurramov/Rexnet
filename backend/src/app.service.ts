import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomBytes, createHash } from "crypto";
import * as nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";
import { User, DataBlock, BlockKind, BlockStatus } from "./entities";
const { block_extraction, match_evaluation } = require("../prompts");

@Injectable()
export class AppService {
  private ai?: GoogleGenAI;
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(DataBlock) private blocks: Repository<DataBlock>,
    private jwt: JwtService,
    private dataSource: DataSource,
  ) {
    if (process.env.GEMINI_API_KEY)
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
  private publicUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      contactInfo: user.contactInfo,
      createdAt: user.createdAt,
    };
  }
  async register(input: any) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.findOneBy({ email }))
      throw new ConflictException(
        "Bu elektron pochta allaqachon ro‘yxatdan o‘tgan.",
      );
    const token = randomBytes(32).toString("hex");
    const user = this.users.create({
      fullName: input.fullName.trim(),
      email,
      passwordHash: await argon2.hash(input.password),
      contactInfo: input.contactInfo.trim(),
      verificationTokenHash: this.hash(token),
      verificationExpiresAt: new Date(Date.now() + 86400000),
    });
    await this.users.save(user);
    await this.sendVerification(user, token);
    return {
      message:
        "Ro‘yxatdan o‘tish muvaffaqiyatli. Elektron pochtangizni tasdiqlang.",
    };
  }
  private async sendVerification(user: User, token: string) {
    if (!process.env.SMTP_HOST)
      throw new BadRequestException(
        "Elektron pochta xizmati sozlanmagan. SMTP ma’lumotlarini kiriting.",
      );
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${token}`;
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: "Rexnet elektron pochtani tasdiqlash",
      text: `Rexnet hisobingizni tasdiqlash uchun havolani oching: ${url}`,
    });
  }
  async verify(token: string) {
    const user = await this.users.findOne({
      where: { verificationTokenHash: this.hash(token) },
    });
    if (
      !user ||
      !user.verificationExpiresAt ||
      user.verificationExpiresAt < new Date()
    )
      throw new BadRequestException(
        "Tasdiqlash havolasi yaroqsiz yoki muddati tugagan.",
      );
    user.isEmailVerified = true;
    user.verificationTokenHash = null;
    user.verificationExpiresAt = null;
    await this.users.save(user);
    return { message: "Elektron pochtangiz tasdiqlandi." };
  }
  async resend(emailInput: string) {
    const user = await this.users.findOneBy({
      email: emailInput.trim().toLowerCase(),
    });
    if (!user || user.isEmailVerified)
      return {
        message: "Agar hisob mavjud bo‘lsa, yangi tasdiqlash xati yuborildi.",
      };
    const token = randomBytes(32).toString("hex");
    user.verificationTokenHash = this.hash(token);
    user.verificationExpiresAt = new Date(Date.now() + 86400000);
    await this.users.save(user);
    await this.sendVerification(user, token);
    return { message: "Yangi tasdiqlash xati yuborildi." };
  }
  async login(input: any) {
    const user = await this.users.findOneBy({
      email: input.email.trim().toLowerCase(),
    });
    if (!user || !(await argon2.verify(user.passwordHash, input.password)))
      throw new UnauthorizedException("Elektron pochta yoki parol noto‘g‘ri.");
    if (!user.isEmailVerified)
      throw new UnauthorizedException(
        "Avval elektron pochtangizni tasdiqlang.",
      );
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        email: user.email,
      }),
      user: this.publicUser(user),
    };
  }
  async me(id: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException("Foydalanuvchi topilmadi.");
    return this.publicUser(user);
  }
  async updateContact(id: string, value: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException("Foydalanuvchi topilmadi.");
    user.contactInfo = value.trim();
    await this.users.save(user);
    return this.publicUser(user);
  }
  private async generate(prompt: string, model: string) {
    if (!this.ai)
      throw new BadRequestException(
        "AI xizmati sozlanmagan. GEMINI_API_KEY kiriting.",
      );
    const result: any = await this.ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(result.text || "");
  }
  private async embed(text: string) {
    if (!this.ai)
      throw new BadRequestException(
        "AI xizmati sozlanmagan. GEMINI_API_KEY kiriting.",
      );
    const result: any = await this.ai.models.embedContent({
      model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
      contents: text,
      config: {
        outputDimensionality: Number(process.env.EMBEDDING_DIMENSIONS || 768),
      },
    });
    return result.embeddings?.[0]?.values || null;
  }
  async process(userId: string, text: string) {
    const output = await this.generate(
      `${block_extraction}\n\nUSER MESSAGE:\n${text}`,
      process.env.GEMINI_EXTRACT_MODEL || "gemini-2.0-flash",
    );
    if (!Array.isArray(output))
      throw new BadRequestException("AI javobi noto‘g‘ri formatda.");
    const items = output
      .slice(0, 10)
      .filter(
        (x: any) =>
          (x.kind === "REQUEST" || x.kind === "OFFER") &&
          typeof x.description === "string" &&
          x.description.trim(),
      );
    if (!items.length)
      throw new BadRequestException(
        "Matndan aniq ehtiyoj yoki taklif topilmadi.",
      );
    const created: DataBlock[] = [];
    for (const item of items) {
      const embedding = await this.embed(item.description);
      created.push(
        await this.blocks.save(
          this.blocks.create({
            userId,
            kind: item.kind,
            description: item.description.trim(),
            allowsMultipleMatches: item.allows_multiple_matches === true,
            embedding,
            status: BlockStatus.PAUSED,
            pairId: null,
          }),
        ),
      );
    }
    return Promise.all(created.map((b) => this.present(b)));
  }
  private async match(block: DataBlock) {
    if (!block.embedding) return;
    const threshold = Number(process.env.MATCH_SIMILARITY_THRESHOLD || 0.65);
    const candidates: any[] = await this.blocks.query(
      `SELECT id, kind, description, many_pair AS "allowsMultipleMatches", user_id AS "userId", 1 - (embedding <=> $1::vector) AS score FROM data_blocks WHERE status = 'ACTIVE' AND kind = $2 AND user_id <> $3 AND embedding IS NOT NULL AND 1 - (embedding <=> $1::vector) >= $4 ORDER BY score DESC LIMIT 10`,
      [
        `[${block.embedding.join(",")}]`,
        block.kind === BlockKind.REQUEST ? BlockKind.OFFER : BlockKind.REQUEST,
        block.userId,
        threshold,
      ],
    );
    const eligible = candidates.filter(
      (c) =>
        !(block.allowsMultipleMatches && c.allowsMultipleMatches) &&
        (c.allowsMultipleMatches || !block.allowsMultipleMatches || !c.pairId),
    );
    if (!eligible.length) return;
    let selected: string[] = eligible.map((c) => c.id);
    if (this.ai) {
      const result = await this.generate(
        `${match_evaluation}\n\nTARGET:\n${JSON.stringify({ id: block.id, kind: block.kind, description: block.description, allows_multiple_matches: block.allowsMultipleMatches })}\nCANDIDATES:\n${JSON.stringify(eligible)}`,
        process.env.GEMINI_MATCH_MODEL || "gemini-2.0-flash",
      );
      selected = Array.isArray(result.matched_candidate_ids)
        ? result.matched_candidate_ids
        : Array.isArray(result.matches)
          ? result.matches.map((m: any) => m.candidate_id)
          : [];
    }
    if (!block.allowsMultipleMatches) selected = selected.slice(0, 1);
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      for (const id of selected) {
        const candidate = await runner.manager.findOne(DataBlock, {
          where: { id },
          lock: { mode: "pessimistic_write" },
        });
        const target = await runner.manager.findOne(DataBlock, {
          where: { id: block.id },
          lock: { mode: "pessimistic_write" },
        });
        if (
          !candidate ||
          !target ||
          candidate.status !== BlockStatus.ACTIVE ||
          candidate.userId === target.userId ||
          candidate.kind === target.kind ||
          (target.allowsMultipleMatches && candidate.allowsMultipleMatches)
        )
          continue;
        if (
          !target.allowsMultipleMatches &&
          target.status !== BlockStatus.ACTIVE
        )
          continue;
        if (
          !target.allowsMultipleMatches &&
          candidate.pairId &&
          !candidate.allowsMultipleMatches
        )
          continue;
        if (target.allowsMultipleMatches) {
          candidate.pairId = target.id;
          candidate.status = BlockStatus.MATCHED;
        } else if (candidate.allowsMultipleMatches) {
          target.pairId = candidate.id;
          target.status = BlockStatus.MATCHED;
        } else {
          target.pairId = candidate.id;
          candidate.pairId = target.id;
          target.status = BlockStatus.MATCHED;
          candidate.status = BlockStatus.MATCHED;
        }
        await runner.manager.save([target, candidate]);
      }
      await runner.commitTransaction();
    } catch (e) {
      await runner.rollbackTransaction();
      throw e;
    } finally {
      await runner.release();
    }
  }
  private async present(block: DataBlock) {
    const matchCount = block.allowsMultipleMatches
      ? await this.blocks.countBy({ pairId: block.id })
      : block.pairId
        ? 1
        : 0;
    let matchedUser: any = null;
    if (block.pairId && !block.allowsMultipleMatches) {
      const other = await this.blocks.findOneBy({ id: block.pairId });
      if (other) {
        const user = await this.users.findOneBy({ id: other.userId });
        if (user)
          matchedUser = {
            fullName: user.fullName,
            contactInfo: user.contactInfo,
          };
      }
    }
    return {
      id: block.id,
      kind: block.kind,
      description: block.description,
      status: block.status,
      allowsMultipleMatches: block.allowsMultipleMatches,
      matchCount,
      createdAt: block.createdAt,
      matchedUser,
    };
  }
  async list(userId: string) {
    const all = await this.blocks.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
    return Promise.all(all.map((b) => this.present(b)));
  }
  async get(userId: string, id: string) {
    const b = await this.blocks.findOneBy({ id, userId });
    if (!b) throw new NotFoundException("Blok topilmadi.");
    return this.present(b);
  }
  async activate(userId: string, ids: string[]) {
    const blocks = await this.blocks.find({ where: { id: In(ids), userId } });
    for (const b of blocks) {
      if (b.status === BlockStatus.PAUSED) {
        b.status = b.pairId ? BlockStatus.MATCHED : BlockStatus.ACTIVE;
        await this.blocks.save(b);
        if (b.pairId && !b.allowsMultipleMatches) {
          const other = await this.blocks.findOneBy({ id: b.pairId });
          if (other && !other.allowsMultipleMatches) {
            other.status = BlockStatus.MATCHED;
            await this.blocks.save(other);
          }
        }
      }
      if (b.status === BlockStatus.ACTIVE) await this.match(b);
    }
    return this.list(userId);
  }
  async action(userId: string, id: string, action: BlockStatus | "DELETE") {
    const b = await this.blocks.findOneBy({ id, userId });
    if (!b) throw new NotFoundException("Blok topilmadi.");
    if (action === "DELETE") {
      if (b.pairId) {
        const other = await this.blocks.findOneBy({ id: b.pairId });
        if (other && !other.allowsMultipleMatches) {
          other.pairId = null;
          other.status = BlockStatus.ACTIVE;
          await this.blocks.save(other);
        }
      }
      await this.blocks.remove(b);
      return { message: "Blok o‘chirildi." };
    }
    b.status = action;
    await this.blocks.save(b);
    if (b.pairId && !b.allowsMultipleMatches) {
      const other = await this.blocks.findOneBy({ id: b.pairId });
      if (other && !other.allowsMultipleMatches) {
        other.status = action;
        await this.blocks.save(other);
      }
    }
    if (action === BlockStatus.ACTIVE) await this.match(b);
    return this.present(b);
  }
}
