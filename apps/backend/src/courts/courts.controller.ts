import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CourtType } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CourtsService,
  CreateCourtDto,
  UpdateCourtDto,
} from './courts.service';

// Define proper types for request objects
interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    [key: string]: any;
  };
}

// Define proper types for query objects
interface CourtQuery {
  type?: CourtType;
  state?: string;
  city?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

@Controller('courts')
@UseGuards(JwtAuthGuard)
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post()
  create(
    @Body() createCourtDto: CreateCourtDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.courtsService.create(createCourtDto);
  }

  @Get()
  findAll(@Query() query: CourtQuery) {
    return this.courtsService.findAll(query);
  }

  @Get('types')
  getCourtTypes() {
    return this.courtsService.getCourtTypes();
  }

  @Get('states')
  getStates() {
    return this.courtsService.getStates();
  }

  @Get('states/:state/cities')
  getCitiesByState(@Param('state') state: string) {
    return this.courtsService.getCitiesByState(state);
  }

  @Get('type/:type')
  getCourtsByType(@Param('type') type: string) {
    return this.courtsService.getCourtsByType(type as CourtType);
  }

  @Get('state/:state')
  getCourtsByState(@Param('state') state: string) {
    return this.courtsService.getCourtsByState(state);
  }

  @Get('city/:city')
  getCourtsByCity(@Param('city') city: string) {
    return this.courtsService.getCourtsByCity(city);
  }

  @Get('search')
  searchCourts(@Query('q') query: string) {
    return this.courtsService.searchCourts(query);
  }

  @Get('name/:name')
  getCourtByName(@Param('name') name: string) {
    return this.courtsService.getCourtByName(name);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourtDto: UpdateCourtDto) {
    return this.courtsService.update(id, updateCourtDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courtsService.remove(id);
  }
}
