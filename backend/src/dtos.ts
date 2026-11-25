import {
  ArrayNotEmpty,
  IsEmail,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
} from "class-validator";
export class RegisterDto {
  @IsString() @Length(2, 120) fullName!: string;
  @IsEmail() @Length(3, 254) email!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsString() @Length(3, 200) contactInfo!: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @IsNotEmpty() password!: string;
}
export class VerifyDto {
  @IsString() @IsNotEmpty() token!: string;
}
export class ContactDto {
  @IsString() @Length(3, 200) contactInfo!: string;
}
export class ProcessDto {
  @IsString() @Length(5, 4000) text!: string;
}
export class IdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  ids!: string[];
}
export class BlockActionDto {
  @IsString() @IsNotEmpty() id!: string;
}
