import { prisma } from '../../config/prisma';
import { config } from '../../config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loginSchema, refreshSchema } from './auth.dto';

interface TokenUser {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string };
}

function refreshExpiryMs(): number {
  const exp = config.jwt.refreshExpiresIn;
  const match = /^(\d+)([smhd])$/.exec(exp);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const mult: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * (mult[match[2]] ?? 86400000);
}

function signAccessToken(user: TokenUser): string {
  return jwt.sign({ sub: user.id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = jwt.sign({ sub: userId, type: 'refresh', jti: crypto.randomUUID() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + refreshExpiryMs()),
    },
  });

  return token;
}

async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string };
}) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const authService = {
  async login(body: unknown) {
    const parsed = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        status: true,
        role: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid email or password' };
    }

    if (user.status !== 'ACTIVE') {
      throw {
        status: 403,
        code: 'FORBIDDEN',
        message: `Account is ${user.status.toLowerCase()}`,
      };
    }

    const valid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!valid) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid email or password' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: publicUser(user),
    };
  },

  async refresh(body: unknown) {
    const parsed = refreshSchema.parse(body);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: parsed.refreshToken },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid refresh token' };
    }

    let payload: { sub: string; type?: string };
    try {
      payload = jwt.verify(parsed.refreshToken, config.jwt.refreshSecret) as {
        sub: string;
        type?: string;
      };
    } catch {
      await revokeRefreshToken(parsed.refreshToken);
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' };
    }

    if (payload.type !== 'refresh' || payload.sub !== stored.userId) {
      await revokeRefreshToken(parsed.refreshToken);
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid refresh token' };
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: { select: { id: true, name: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      await revokeRefreshToken(parsed.refreshToken);
      throw { status: 401, code: 'UNAUTHORIZED', message: 'User not found or inactive' };
    }

    // Rotate: revoke old token, issue new pair
    await revokeRefreshToken(parsed.refreshToken);
    const accessToken = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: publicUser(user),
    };
  },

  async logout(body: unknown) {
    const parsed = refreshSchema.parse(body);
    await revokeRefreshToken(parsed.refreshToken);
    return { success: true };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        deletedAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'User not found or inactive' };
    }

    return publicUser(user);
  },
};
