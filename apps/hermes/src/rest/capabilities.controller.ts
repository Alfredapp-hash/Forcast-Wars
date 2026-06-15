import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CapabilitiesService } from '../services/capabilities.service.js';
import type { CapabilityRegistration } from '../hermes.types.js';

@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly caps: CapabilitiesService) {}

  @Get()
  list() {
    return this.caps.list();
  }

  @Get('role/:role')
  findByRole(@Param('role') role: string) {
    return this.caps.findByRole(role);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: CapabilityRegistration) {
    return this.caps.register(body);
  }

  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(@Param('id') id: string) {
    await this.caps.heartbeat(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deregister(@Param('id') id: string) {
    await this.caps.deregister(id);
  }
}
