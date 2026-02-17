import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsString, Min } from "class-validator";

export class createPaymentDto {
    @ApiProperty()
    @IsNumber()
    @Min(10000)
    amount: number;

    @ApiPropertyOptional()
    @IsString()
    userName?: string;

    @ApiPropertyOptional()
    @IsString()
    message?: string;
}