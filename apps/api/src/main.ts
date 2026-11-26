import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './common/http/configure-app.js';
import { loadConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const config = loadConfig(process.env);
  // Nest declares its options as a class but documents passing a plain object literal.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register({ config }), {
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  configureApp(app, config);
  app.enableShutdownHooks();
  await app.listen(config.port);
}

await bootstrap();
