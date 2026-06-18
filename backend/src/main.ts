import "reflect-metadata";

import { UnprocessableEntityException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { WsAdapter } from "@nestjs/platform-ws";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      exceptionFactory: (errors) => {
        const firstError = errors[0];
        const message =
          firstError?.constraints !== undefined
            ? Object.values(firstError.constraints)[0]
            : "Validation failed";
        return new UnprocessableEntityException({ error: message });
      },
    })
  );

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>("port");

  const swaggerConfig = new DocumentBuilder()
    .setTitle("chugas API")
    .setDescription(
      "Social API with auth, posts, communities, chat and geolocation"
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("/swagger", app, document);

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
