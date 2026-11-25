import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "../src/auth.guard";
import { AppService } from "../src/app.service";
import { BlockKind, BlockStatus, DataBlock, User } from "../src/entities";
import {
  ContactDto,
  IdsDto,
  ProcessDto,
  RegisterDto,
  VerifyDto,
} from "../src/dtos";

async function dtoErrors(dto: any, values: Record<string, unknown>) {
  const instance = plainToInstance(dto, values) as object;
  return validate(instance);
}

function makeService() {
  const users: any = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const blocks: any = {
    findOneBy: jest.fn(),
    find: jest.fn(async () => []),
    findBy: jest.fn(),
    countBy: jest.fn(async () => 0),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    remove: jest.fn(),
    query: jest.fn(async () => []),
  };
  const jwt: any = {
    signAsync: jest.fn(async () => "jwt-token"),
    verify: jest.fn(),
  };
  const dataSource: any = {
    createQueryRunner: jest.fn(),
  };
  const service = new AppService(users, blocks, jwt, dataSource);
  return { service, users, blocks, jwt, dataSource };
}

describe("Rexnet SQA testlari", () => {
  test("TC-01: to‘liq va to‘g‘ri ro‘yxatdan o‘tish ma’lumotlari qabul qilinadi", async () => {
    const errors = await dtoErrors(RegisterDto, {
      fullName: "Aziz Karimov",
      email: "aziz@example.com",
      password: "12345678",
      contactInfo: "Telegram: @aziz",
    });
    expect(errors).toHaveLength(0);
  });

  test("TC-02: 1 belgili to‘liq ism rad etiladi", async () => {
    const errors = await dtoErrors(RegisterDto, {
      fullName: "A",
      email: "a@example.com",
      password: "12345678",
      contactInfo: "Telefon: 123456789",
    });
    expect(errors.some((error) => error.property === "fullName")).toBe(true);
  });

  test("TC-03: noto‘g‘ri email formati rad etiladi", async () => {
    const errors = await dtoErrors(RegisterDto, {
      fullName: "Aziz Karimov",
      email: "noto-gri-email",
      password: "12345678",
      contactInfo: "Telegram: @aziz",
    });
    expect(errors.some((error) => error.property === "email")).toBe(true);
  });

  test("TC-04: 4001 belgili blok matni rad etiladi", async () => {
    const errors = await dtoErrors(ProcessDto, { text: "A".repeat(4001) });
    expect(errors.some((error) => error.property === "text")).toBe(true);
  });

  test("TC-05: bo‘sh aloqa ma’lumotlari rad etiladi", async () => {
    const errors = await dtoErrors(ContactDto, { contactInfo: "" });
    expect(errors.some((error) => error.property === "contactInfo")).toBe(true);
  });

  test("TC-06: bo‘sh tasdiqlash tokeni rad etiladi", async () => {
    const errors = await dtoErrors(VerifyDto, { token: "" });
    expect(errors.some((error) => error.property === "token")).toBe(true);
  });

  test("TC-07: Authorization header bo‘lmasa AuthGuard ruxsat bermaydi", () => {
    const jwt = { verify: jest.fn() } as any;
    const guard = new AuthGuard(jwt);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  test("TC-08: yaroqli JWT bilan AuthGuard ruxsat beradi", () => {
    const jwt = { verify: jest.fn(() => ({ sub: "user-1" })) } as any;
    const guard = new AuthGuard(jwt);
    const request: any = { headers: { authorization: "Bearer yaroqli-token" } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user.sub).toBe("user-1");
  });

  test("TC-09: AI noto‘g‘ri format qaytarsa process BadRequestException beradi", async () => {
    const { service } = makeService();
    jest
      .spyOn(service as any, "generate")
      .mockResolvedValue({ unexpected: true });

    await expect(
      service.process("user-1", "Men Python o‘rgana olishni istayman"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test("TC-10: mavjud bo‘lmagan user me() NotFoundException beradi", async () => {
    const { service, users } = makeService();
    users.findOneBy.mockResolvedValue(null);

    await expect(service.me("mavjud-emas")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test("TC-11: 1000 marta DTO tekshirish 2 soniyadan tez tugaydi", async () => {
    const started = performance.now();
    for (let index = 0; index < 1000; index++) {
      await dtoErrors(ProcessDto, { text: "Pythonni o‘rganmoqchiman" });
    }
    const elapsed = performance.now() - started;
    console.log(`TC-11: 1000 DTO tekshiruvi = ${elapsed.toFixed(2)} ms`);

    expect(elapsed).toBeLessThan(2000);
  });

  test("TC-12: ids parametri massiv bo‘lmasa rad etiladi", async () => {
    const errors = await dtoErrors(IdsDto, { ids: "block-1" });
    expect(errors.some((error) => error.property === "ids")).toBe(true);
  });

  test("TC-13: ids bo‘sh massiv bo‘lsa rad etiladi", async () => {
    const errors = await dtoErrors(IdsDto, { ids: [] });
    expect(errors.some((error) => error.property === "ids")).toBe(true);
  });

  test("TC-14: 201 belgili aloqa ma’lumoti rad etiladi", async () => {
    const errors = await dtoErrors(ContactDto, {
      contactInfo: "A".repeat(201),
    });
    expect(errors.some((error) => error.property === "contactInfo")).toBe(true);
  });

  test("TC-15: 129 belgili parol rad etiladi", async () => {
    const errors = await dtoErrors(RegisterDto, {
      fullName: "Aziz Karimov",
      email: "aziz@example.com",
      password: "A".repeat(129),
      contactInfo: "Telegram: @aziz",
    });
    expect(errors.some((error) => error.property === "password")).toBe(true);
  });
});
