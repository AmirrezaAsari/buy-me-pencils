import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;

  beforeEach(() => {
    const orig = process.env.UNOSEND_API_KEY;
    delete process.env.UNOSEND_API_KEY;
    service = new MailService();
    if (orig) process.env.UNOSEND_API_KEY = orig;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtpEmail', () => {
    it('should not throw when apiKey is not set (dev mode)', async () => {
      await expect(
        service.sendOtpEmail('test@example.com', '123456', 'signup'),
      ).resolves.not.toThrow();
    });

    it('should not throw for forgot_password purpose', async () => {
      await expect(
        service.sendOtpEmail('test@example.com', '654321', 'forgot_password'),
      ).resolves.not.toThrow();
    });
  });
});
