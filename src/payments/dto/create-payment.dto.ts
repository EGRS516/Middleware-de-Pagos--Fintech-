import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Amount to charge', example: 100.5 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty({ enum: PaymentProvider, description: 'Payment provider to use' })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsString()
  @IsOptional()
  customerEmail?: string;
}
