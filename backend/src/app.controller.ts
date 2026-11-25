import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { AppService } from "./app.service";
import {
  ContactDto,
  IdsDto,
  LoginDto,
  ProcessDto,
  RegisterDto,
  VerifyDto,
} from "./dtos";
@Controller()
export class AppController {
  constructor(private readonly service: AppService) {}
  @Post("auth/register") register(@Body() body: RegisterDto) {
    return this.service.register(body);
  }
  @Post("auth/login") login(@Body() body: LoginDto) {
    return this.service.login(body);
  }
  @Post("auth/verify-email") verify(@Body() body: VerifyDto) {
    return this.service.verify(body.token);
  }
  @Post("auth/resend-verification") resend(@Body() body: LoginDto) {
    return this.service.resend(body.email);
  }
  @UseGuards(AuthGuard) @Get("users/me") me(@Req() req: any) {
    return this.service.me(req.user.sub);
  }
  @UseGuards(AuthGuard) @Patch("users/me/contact") contact(
    @Req() req: any,
    @Body() body: ContactDto,
  ) {
    return this.service.updateContact(req.user.sub, body.contactInfo);
  }
  @UseGuards(AuthGuard) @Post("data-blocks/process") process(
    @Req() req: any,
    @Body() body: ProcessDto,
  ) {
    return this.service.process(req.user.sub, body.text);
  }
  @UseGuards(AuthGuard) @Get("data-blocks") list(@Req() req: any) {
    return this.service.list(req.user.sub);
  }
  @UseGuards(AuthGuard) @Get("data-blocks/:id") get(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.service.get(req.user.sub, id);
  }
  @UseGuards(AuthGuard) @Post("data-blocks/activate") activate(
    @Req() req: any,
    @Body() body: IdsDto,
  ) {
    return this.service.activate(req.user.sub, body.ids);
  }
  @UseGuards(AuthGuard) @Post("data-blocks/activate-all") activateAll(
    @Req() req: any,
    @Body() body: IdsDto,
  ) {
    return this.service.activate(req.user.sub, body.ids);
  }
  @UseGuards(AuthGuard) @Post("data-blocks/:id/pause") pause(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.service.action(req.user.sub, id, "PAUSED" as any);
  }
  @UseGuards(AuthGuard) @Post("data-blocks/:id/complete") complete(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.service.action(req.user.sub, id, "COMPLETED" as any);
  }
  @UseGuards(AuthGuard) @Post("data-blocks/:id/activate") activateOne(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.service.action(req.user.sub, id, "ACTIVE" as any);
  }
  @UseGuards(AuthGuard) @Delete("data-blocks/:id") remove(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.service.action(req.user.sub, id, "DELETE");
  }
  @UseGuards(AuthGuard) @Delete("data-blocks/batch") removeBatch(
    @Req() req: any,
    @Body() body: IdsDto,
  ) {
    return Promise.all(
      body.ids.map((id) => this.service.action(req.user.sub, id, "DELETE")),
    );
  }
}
