import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';
import { LoginCodeDto, LoginDto, RegisterParentDto } from './dto';
import { StudentsService } from '../students/students.service';
import {
  hashLoginCode,
  isValidLoginCodeFormat,
  normalizeLoginCodeInput,
} from '../common/login-code';

/** Well-known demo codes (plaintext only for login-page hints; DB stores hash). */
const DEMO_LOGIN_CODES: Record<string, string> = {
  student1: '10293847',
  student2: '20384756',
};

type TokenVia = 'password' | 'code' | 'proxy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly students: StudentsService,
  ) {}

  private async issueToken(
    user: User,
    opts?: { proxy?: boolean; via?: TokenVia },
  ) {
    const via: TokenVia = opts?.proxy ? 'proxy' : opts?.via || 'password';
    const payload: {
      sub: number;
      role: string;
      via: TokenVia;
      proxy?: boolean;
      pe?: number;
    } = {
      sub: user.id,
      role: user.role,
      via,
    };
    if (opts?.proxy) {
      payload.proxy = true;
    }
    // Students: always bind session epoch (code / password / proxy)
    if (user.role === UserRole.STUDENT) {
      payload.pe = user.proxyEpoch || 0;
    }
    const expiresIn =
      via === 'proxy'
        ? process.env.JWT_PROXY_EXPIRES_IN || '2h'
        : via === 'code'
          ? process.env.JWT_CODE_EXPIRES_IN || '12h'
          : process.env.JWT_EXPIRES_IN || '7d';
    const token = await this.jwt.signAsync(payload, { expiresIn } as any);
    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        pointsBalance: user.pointsBalance,
        isProxy: !!opts?.proxy,
      },
    };
  }

  async registerParent(dto: RegisterParentDto) {
    const exists = await this.users.findOne({ where: { username: dto.username } });
    if (exists) throw new BadRequestException('用户名已存在');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.save(
      this.users.create({
        username: dto.username,
        passwordHash,
        name: dto.name,
        role: UserRole.PARENT,
        pointsBalance: 0,
      }),
    );
    return this.issueToken(user, { via: 'password' });
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { username: dto.username } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('用户名或密码错误');
    return this.issueToken(user, { via: 'password' });
  }

  private async findStudentByLoginCode(code: string): Promise<User | null> {
    const hash = hashLoginCode(code);
    return this.users.findOne({ where: { loginCodeHash: hash } });
  }

  async loginByCode(dto: LoginCodeDto) {
    const code = normalizeLoginCodeInput(dto.code);
    if (!isValidLoginCodeFormat(code)) {
      throw new UnauthorizedException('登录码无效');
    }
    const user = await this.findStudentByLoginCode(code);
    if (!user || user.role !== UserRole.STUDENT) {
      throw new UnauthorizedException('登录码无效');
    }
    if (
      !user.loginCodeExpiresAt ||
      new Date(user.loginCodeExpiresAt).getTime() < Date.now()
    ) {
      throw new UnauthorizedException('登录码已过期，请让家长刷新');
    }
    return this.issueToken(user, { via: 'code' });
  }

  /** Parent enters student session on shared device (client keeps parent token backup). */
  async enterAsStudent(parentId: number, studentId: number) {
    await this.students.assertBound(parentId, studentId);
    const user = await this.users.findOne({
      where: { id: studentId, role: UserRole.STUDENT },
    });
    if (!user) throw new UnauthorizedException('学生不存在');
    if (!user.loginCodeHash) {
      throw new UnauthorizedException('请先为学生生成登录码');
    }
    if (
      !user.loginCodeExpiresAt ||
      new Date(user.loginCodeExpiresAt).getTime() < Date.now()
    ) {
      throw new UnauthorizedException('登录码已过期，请先刷新后再帮孩子进入');
    }
    return this.issueToken(user, { proxy: true, via: 'proxy' });
  }

  async me(userId: number, isProxy = false) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      pointsBalance: user.pointsBalance,
      isProxy: !!isProxy,
    };
  }

  /** Whether login-page demo hints are allowed (off in production unless ENABLE_DEMO_HINTS=true). */
  demoHintsEnabled(): boolean {
    const flag = (process.env.ENABLE_DEMO_HINTS || '').toLowerCase();
    if (flag === 'true' || flag === '1') return true;
    if (flag === 'false' || flag === '0') return false;
    return (process.env.NODE_ENV || 'development').toLowerCase() !== 'production';
  }

  /** Live demo login codes for the login page (seed accounts only). */
  async demoHints() {
    if (!this.demoHintsEnabled()) {
      return { enabled: false as const, parent: null, students: [] as any[] };
    }
    const parent = await this.users.findOne({
      where: { username: 'parent@demo.com', role: UserRole.PARENT },
    });
    const students = await this.users.find({
      where: [
        { username: 'student1', role: UserRole.STUDENT },
        { username: 'student2', role: UserRole.STUDENT },
      ],
      order: { id: 'ASC' },
    });
    const now = Date.now();
    return {
      enabled: true as const,
      parent: parent
        ? { username: parent.username, passwordHint: 'demo1234' }
        : null,
      students: students.map((s) => {
        const expired =
          !s.loginCodeExpiresAt ||
          new Date(s.loginCodeExpiresAt).getTime() < now;
        const known = DEMO_LOGIN_CODES[s.username];
        const hashOk =
          !!known &&
          !!s.loginCodeHash &&
          s.loginCodeHash === hashLoginCode(known);
        return {
          name: s.name,
          username: s.username,
          loginCode: !expired && hashOk ? known : null,
          expired,
        };
      }),
    };
  }
}
