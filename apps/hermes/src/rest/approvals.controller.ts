import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApprovalsService } from '../services/approvals.service.js';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  list() {
    return this.approvals.list();
  }

  @Post(':approvalId/resolve')
  @HttpCode(HttpStatus.OK)
  resolve(
    @Param('approvalId') approvalId: string,
    @Body() body: { granted: boolean },
  ) {
    return this.approvals.resolve(approvalId, body.granted);
  }
}
