import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment intention' })
  @ApiResponse({ status: 201, description: 'The payment has been successfully created.' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment status by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}
