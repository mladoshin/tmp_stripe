import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    httpsOptions: {
      key: fs.readFileSync(
        '/etc/letsencrypt/live/api.proteadigital.com/privkey.pem',
      ),
      cert: fs.readFileSync(
        '/etc/letsencrypt/live/api.proteadigital.com/cert.pem',
      ),
    },
  });
  await app.listen(443);
}
bootstrap();
