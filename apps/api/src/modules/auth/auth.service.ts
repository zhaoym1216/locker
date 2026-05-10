import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.email },
          { phone: dto.phone },
        ].filter(Boolean) as any,
      },
    });

    if (existing) {
      throw new ConflictException('用户名、邮箱或手机号已被注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        nickname: dto.nickname || dto.username,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        setting: { create: {} },
      },
      select: { id: true, username: true, nickname: true },
    });

    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.account },
          { email: dto.account },
          { phone: dto.account },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('账号或密码错误');
    }

    return this.generateToken({ id: user.id, username: user.username, nickname: user.nickname });
  }

  private generateToken(user: { id: string; username: string; nickname: string }) {
    const payload = { sub: user.id, username: user.username };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
