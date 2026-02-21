import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateCardInfoDto {
  @ApiProperty()
  @IsString()
  cardNumber: string;

  @ApiProperty()
  @IsString()
  holderName: string;
}
