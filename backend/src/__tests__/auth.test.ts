import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

describe('Auth Security Functions', () => {
  it('should hash password and verify properly', async () => {
    const password = 'SecretPassword123!';
    const hash = await bcrypt.hash(password, 10);
    expect(hash).not.toBe(password);

    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await bcrypt.compare('WrongPassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('should sign and verify access token correctly', () => {
    const payload = { sub: 'user-123', role: 'SUPER_ADMIN' };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '15m' });

    const decoded = jwt.verify(token, config.jwt.secret) as { sub: string; role: string };
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('SUPER_ADMIN');
  });

  it('should reject invalid token signature', () => {
    const token = jwt.sign({ sub: 'user-123' }, 'wrong-secret', { expiresIn: '15m' });
    expect(() => {
      jwt.verify(token, config.jwt.secret);
    }).toThrow();
  });
});
