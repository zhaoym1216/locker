import { Injectable, BadRequestException, ConflictException, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { lookupDomain } from './domain-map';
import * as nodemailer from 'nodemailer';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.126.com'),
      port: this.config.get<number>('SMTP_PORT', 465),
      secure: true,
      auth: {
        user: this.config.get('SMTP_USER', ''),
        pass: this.config.get('SMTP_PASS', ''),
      },
    });
  }

  async list(userId: string) {
    return this.prisma.verification.findMany({
      where: { userId, status: 1 },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const record = await this.prisma.verification.findFirst({
      where: { id, userId, status: 1 },
    });
    if (!record) throw new BadRequestException('认证记录不存在');

    // 清除 UserProfile 中的认证字段
    if (record.type === 'EMAIL') {
      await this.prisma.userProfile.updateMany({
        where: { userId, verifiedEmail: record.value },
        data: { verifiedEmail: null },
      });
    } else if (record.type === 'LOCATION') {
      await this.prisma.userProfile.updateMany({
        where: { userId, verifiedCity: record.value },
        data: { verifiedCity: null },
      });
    }

    // 退出自动加入的圈子
    const result = record.type === 'EMAIL' ? lookupDomain(record.value) : null;
    let circleName: string | null = null;
    if (record.type === 'LOCATION') {
      circleName = `${record.value}圈`;
    } else if (result) {
      circleName = result.name;
    }

    if (circleName) {
      const circle = await this.prisma.circle.findUnique({ where: { name: circleName } });
      if (circle) {
        await this.prisma.circleMember.deleteMany({
          where: { circleId: circle.id, userId },
        });
        await this.prisma.circle.update({
          where: { id: circle.id },
          data: { memberCount: { decrement: 1 } },
        });
      }
    }

    await this.prisma.verification.delete({ where: { id } });
    return { deleted: true };
  }

  async sendEmailCode(userId: string, email: string) {
    const existing = await this.prisma.verification.findUnique({
      where: { userId_type_value: { userId, type: 'EMAIL', value: email } },
    });
    if (existing?.status === 1) {
      throw new ConflictException('该邮箱已验证');
    }

    const code = Math.random().toString().slice(2, 8);

    if (existing) {
      await this.prisma.verification.update({
        where: { id: existing.id },
        data: { code, status: 0 },
      });
    } else {
      await this.prisma.verification.create({
        data: { userId, type: 'EMAIL', value: email, code, status: 0 },
      });
    }

    // 发送邮件
    const from = this.config.get('SMTP_USER', 'locker_bot@126.com');
    try {
      await this.transporter.sendMail({
        from: `Locker <${from}>`,
        to: email,
        subject: '【Locker】邮箱验证码',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1e40af;">Locker 邮箱验证</h2>
            <p>你好，你正在验证邮箱地址，验证码为：</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111; background: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">验证码 10 分钟内有效，请勿泄露给他人。</p>
          </div>
        `,
      });
      this.logger.log(`验证码已发送至 ${email}`);
    } catch (err) {
      this.logger.error(`邮件发送失败: ${err.message}`);
      throw new BadRequestException('邮件发送失败，请稍后重试');
    }

    return { message: '验证码已发送，请查收邮箱' };
  }

  async verifyEmail(userId: string, email: string, code: string) {
    const record = await this.prisma.verification.findUnique({
      where: { userId_type_value: { userId, type: 'EMAIL', value: email } },
    });
    if (!record) throw new BadRequestException('请先发送验证码');
    if (record.status === 1) throw new ConflictException('该邮箱已验证');
    if (record.code !== code) throw new BadRequestException('验证码错误');

    await this.prisma.verification.update({
      where: { id: record.id },
      data: { status: 1 },
    });

    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, verifiedEmail: email },
      update: { verifiedEmail: email },
    });

    const result = lookupDomain(email);
    let joinedCircle: any = null;

    if (result) {
      const circleName = result.name;
      const circleType = result.type === 'SCHOOL' ? 'ALUMNI' : 'COMPANY';
      try {
        joinedCircle = await this.findOrCreateCircleAndJoin(userId, circleName, circleType, 'EMAIL');
      } catch (err) {
        this.logger.error(`加入${result.type === 'SCHOOL' ? '校友' : '企业'}圈失败: ${err.message}`);
      }
    }

    return {
      verified: true,
      domain: result,
      joinedCircle: joinedCircle ? { id: joinedCircle.id, name: joinedCircle.name, type: joinedCircle.type } : null,
    };
  }

  /** 后端逆地理编码：坐标 → 城市名 */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // 尝试腾讯地图 REST API
    const tencentCity = await this.reverseGeocodeTencent(lat, lng);
    if (tencentCity) return tencentCity;

    // 回退 Nominatim
    const nominatimCity = await this.reverseGeocodeNominatim(lat, lng);
    if (nominatimCity) return nominatimCity;

    throw new BadRequestException('位置识别失败，请稍后重试');
  }

  private async reverseGeocodeTencent(lat: number, lng: number): Promise<string | null> {
    try {
      const key = this.config.get('QQ_MAP_KEY', 'OB4BZ-D4W3U-B7VVO-4PJWW-6TKDJ-WPB77');
      const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${key}&get_poi=0`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'LockerApp/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data.status !== 0) {
        this.logger.warn(`腾讯地图逆地理编码失败: ${data.message}`);
        return null;
      }
      let city = data.result?.address_component?.city || data.result?.address_component?.district || null;
      if (city && city.endsWith('市')) city = city.slice(0, -1);
      return city;
    } catch (err) {
      this.logger.warn(`腾讯地图请求异常: ${err.message}`);
      return null;
    }
  }

  private async reverseGeocodeNominatim(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=zh-CN`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'LockerApp/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      const addr = data.address;
      if (!addr) return null;
      return addr.city || addr.town || addr.village || addr.county || addr.state || null;
    } catch (err) {
      this.logger.warn(`Nominatim 请求异常: ${err.message}`);
      return null;
    }
  }

  async verifyLocation(userId: string, city: string) {
    const trimmed = city.trim();
    if (!trimmed) throw new BadRequestException('请输入城市名称');

    // 位置认证只能保留一个，删除旧的位置认证记录
    const oldRecords = await this.prisma.verification.findMany({
      where: { userId, type: 'LOCATION', status: 1 },
    });
    for (const old of oldRecords) {
      // 清除旧的 verifiedCity
      await this.prisma.userProfile.updateMany({
        where: { userId, verifiedCity: old.value },
        data: { verifiedCity: null },
      });
      // 退出旧的地域圈
      const oldCircleName = `${old.value}圈`;
      const oldCircle = await this.prisma.circle.findUnique({ where: { name: oldCircleName } });
      if (oldCircle) {
        await this.prisma.circleMember.deleteMany({
          where: { circleId: oldCircle.id, userId },
        });
        await this.prisma.circle.update({
          where: { id: oldCircle.id },
          data: { memberCount: { decrement: 1 } },
        });
      }
      await this.prisma.verification.delete({ where: { id: old.id } });
    }

    // 同时清理该用户所有待验证的位置记录
    await this.prisma.verification.deleteMany({
      where: { userId, type: 'LOCATION', status: 0 },
    });

    const record = await this.prisma.verification.create({
      data: { userId, type: 'LOCATION', value: trimmed, status: 1 },
    });

    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, verifiedCity: trimmed },
      update: { verifiedCity: trimmed },
    });

    const circleName = `${trimmed}圈`;
    let joinedCircle: any = null;
    try {
      joinedCircle = await this.findOrCreateCircleAndJoin(userId, circleName, 'REGION', 'LOCATION');
    } catch (err) {
      this.logger.error(`加入地域圈失败: ${err.message}`);
    }

    return {
      verified: true,
      city: trimmed,
      joinedCircle: joinedCircle ? { id: joinedCircle.id, name: joinedCircle.name, type: joinedCircle.type } : null,
    };
  }

  private async findOrCreateCircleAndJoin(userId: string, name: string, type: string, authMethod: string) {
    this.logger.log(`findOrCreateCircleAndJoin: userId=${userId}, name=${name}, type=${type}`);

    // 圈子名称最长 50 字符
    if (name.length > 50) {
      this.logger.warn(`圈子名称过长，截断: ${name}`);
      name = name.slice(0, 50);
    }

    let circle = await this.prisma.circle.findUnique({ where: { name } });

    if (!circle) {
      this.logger.log(`Creating new system circle: ${name}`);
      circle = await this.prisma.circle.create({
        data: {
          name,
          type,
          isSystem: true,
          isPublic: false,
          authMethods: [authMethod],
          ownerId: userId,
          members: { create: { userId, role: 'OWNER', status: 1 } },
          memberCount: 1,
        },
      });
      return circle;
    }

    const existingMember = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId } },
    });
    if (existingMember) return circle;

    this.logger.log(`Adding user ${userId} to circle ${name}`);
    await this.prisma.circleMember.create({
      data: { circleId: circle.id, userId, role: 'MEMBER', status: 1 },
    });
    await this.prisma.circle.update({
      where: { id: circle.id },
      data: { memberCount: { increment: 1 } },
    });

    return circle;
  }
}
