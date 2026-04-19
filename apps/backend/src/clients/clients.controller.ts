import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async getAllClients(@Request() req: AuthenticatedRequest) {
    // This is a temporary route for testing - in production, clients should be scoped to practices
    return this.clientsService.getAllClients(req.user.sub);
  }

  @Post(':practiceId')
  @Roles(
    UserRole.LAWYER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ASSOCIATE,
  )
  async createClient(
    @Param('practiceId') practiceId: string,
    @Request() req: AuthenticatedRequest,
    @Body() createClientDto: CreateClientDto,
  ) {
    return this.clientsService.createClient(
      practiceId,
      req.user.sub,
      createClientDto,
    );
  }

  @Get(':practiceId')
  async getClientsByPractice(
    @Param('practiceId') practiceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientsService.getClientsByPractice(practiceId, req.user.sub);
  }

  @Get(':practiceId/search')
  async searchClients(
    @Param('practiceId') practiceId: string,
    @Query('q') searchTerm: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientsService.searchClients(
      practiceId,
      req.user.sub,
      searchTerm,
    );
  }

  @Get('detail/:id')
  async getClientById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientsService.getClientById(id, req.user.sub);
  }

  @Put(':id')
  @Roles(
    UserRole.LAWYER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ASSOCIATE,
  )
  async updateClient(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.updateClient(id, req.user.sub, updateClientDto);
  }

  @Delete(':id')
  @Roles(UserRole.LAWYER, UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async deleteClient(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientsService.deleteClient(id, req.user.sub);
  }

  @Get(':practiceId/stats')
  async getClientStats(
    @Param('practiceId') practiceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clientsService.getClientStats(practiceId, req.user.sub);
  }
}
