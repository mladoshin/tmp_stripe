import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import { ValidationPipe } from '@nestjs/common';
import * as helmet from 'helmet';
import { LoggingInterceptor } from './middlewares/logging.interceptor';
import { json } from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    httpsOptions: {
      key: fs.readFileSync(
        '/etc/letsencrypt/live/api.proteadigital.com/privkey.pem',
      ),
      cert: fs.readFileSync(
        '/etc/letsencrypt/live/api.proteadigital.com/cert.pem',
      ),
    },
  });

  app.use(json());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe());
  app.use(helmet.default());
  app.enableCors();

  await app.listen(443);
}
bootstrap();
