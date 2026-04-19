import { Injectable, NotFoundException } from '@nestjs/common';
import { CourtType } from '@prisma/client';
import { RedactingLogger } from '../common/logging';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCourtDto {
  name: string;
  type: CourtType;
  address: string;
  city: string;
  state: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  jurisdiction?: string;
}

export interface UpdateCourtDto {
  name?: string;
  type?: CourtType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  jurisdiction?: string;
  isActive?: boolean;
}

@Injectable()
export class CourtsService {
  private readonly logger = new RedactingLogger(CourtsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createCourtDto: CreateCourtDto) {
    return this.prisma.court.create({
      data: createCourtDto,
    });
  }

  async findAll(query: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.state) {
      where.state = query.state;
    }

    if (query.city) {
      where.city = query.city;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const courts = await this.prisma.court.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return courts;
  }

  async findOne(id: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return court;
  }

  async findByName(name: string) {
    const court = await this.prisma.court.findUnique({
      where: { name },
    });

    if (!court) {
      throw new NotFoundException(`Court with name ${name} not found`);
    }

    return court;
  }

  async update(id: string, updateCourtDto: UpdateCourtDto) {
    try {
      return await this.prisma.court.update({
        where: { id },
        data: updateCourtDto,
      });
    } catch {
      throw new NotFoundException('Court not found');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.court.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Court not found');
    }
  }

  getCourtTypes() {
    return Object.values(CourtType);
  }

  async getStates() {
    const states = await this.prisma.court.findMany({
      select: {
        state: true,
      },
      distinct: ['state'],
      orderBy: {
        state: 'asc',
      },
    });

    return states.map((s) => s.state);
  }

  async getCitiesByState(state: string) {
    const cities = await this.prisma.court.findMany({
      where: {
        state: state,
      },
      select: {
        city: true,
      },
      distinct: ['city'],
      orderBy: {
        city: 'asc',
      },
    });

    return cities.map((c) => c.city);
  }

  async getCities(state: string) {
    return this.getCitiesByState(state);
  }

  async importCourts(courts: CreateCourtDto[]) {
    const createdCourts = [];
    for (const court of courts) {
      try {
        const created = await this.create(court);
        createdCourts.push(created);
      } catch (error) {
        this.logger.error(`Failed to import court ${court.name}:`, error);
      }
    }
    return createdCourts;
  }

  async findNearbyCourts(
    lat: number,
    lng: number,
    radius: number,
    type: CourtType,
  ) {
    // Placeholder implementation - would need geospatial queries
    return this.prisma.court.findMany({
      where: {
        type: type,
        isActive: true,
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
  }

  async getCourtsByType(type: CourtType) {
    return this.prisma.court.findMany({
      where: {
        type: type,
        isActive: true,
      },
      orderBy: [{ state: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });
  }

  async getCourtsByState(state: string) {
    return this.prisma.court.findMany({
      where: {
        state: state,
        isActive: true,
      },
      orderBy: [{ type: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });
  }

  async getCourtsByCity(city: string) {
    return this.prisma.court.findMany({
      where: {
        city: city,
        isActive: true,
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async searchCourts(query: string) {
    return this.prisma.court.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            city: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            state: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
        isActive: true,
      },
      orderBy: [
        { type: 'asc' },
        { state: 'asc' },
        { city: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async getCourtByName(name: string) {
    return this.prisma.court.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        isActive: true,
      },
    });
  }
}
