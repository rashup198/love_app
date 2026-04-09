import { Controller, Post, Req, Headers, BadRequestException, Logger } from '@nestjs/common';
import { Webhook } from 'svix';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { Request } from 'express';

@Controller('webhooks/clerk')
export class AuthController {
  private readonly logger = new Logger('ClerkWebhook');

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(@Req() req: Request, @Headers() headers: any) {
    const WEBHOOK_SECRET = this.config.get<string>('CLERK_WEBHOOK_SECRET');
    if (!WEBHOOK_SECRET) {
      this.logger.error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
      throw new BadRequestException('Webhook configuration missing');
    }

    const svix_id = headers['svix-id'];
    const svix_timestamp = headers['svix-timestamp'];
    const svix_signature = headers['svix-signature'];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      throw new BadRequestException('Missing svix headers');
    }

    const payload = JSON.stringify(req.body);
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err: any) {
      this.logger.error('Error verifying webhook:', err.message);
      throw new BadRequestException('Invalid signature');
    }

    // Handle user.created event to automatically sync users to Prisma DB
    if (evt.type === 'user.created') {
      const { id, email_addresses } = evt.data;
      const primaryEmail = email_addresses.find((e: any) => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses[0]?.email_address;
      
      this.logger.log(`New user synced from Clerk: ${id} (${primaryEmail})`);
      
      await this.prisma.user.upsert({
        where: { id },
        update: {
          email: primaryEmail,
        },
        create: {
          id,
          email: primaryEmail,
          isOnboarded: false,
        },
      });
    }

    // You can handle other events like user.updated or user.deleted here
    if (evt.type === 'user.deleted') {
      const { id } = evt.data;
      await this.prisma.user.delete({ where: { id } }).catch(() => null);
    }

    return { received: true };
  }
}
