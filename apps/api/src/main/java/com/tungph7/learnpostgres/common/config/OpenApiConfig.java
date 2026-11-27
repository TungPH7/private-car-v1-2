package com.tungph7.learnpostgres.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI learnPostgresApi(
      @Value("${spring.application.name}") String appName,
      @Value("${info.app.version:0.0.1-SNAPSHOT}") String version) {
    return new OpenAPI()
        .info(
            new Info()
                .title("Learn PostgreSQL API")
                .description("Enterprise-grade Spring Boot + PostgreSQL learning project")
                .version(version)
                .contact(new Contact().name("TungPH").email("noreply@example.com"))
                .license(new License().name("MIT").url("https://opensource.org/license/mit")))
        // No fixed servers: the api runs on its own host in each environment, and springdoc
        // writes the server of the request when the document names none, so "Try it out" of
        // Swagger UI calls the host it was opened on.
        .components(
            new Components()
                .addSecuritySchemes(
                    "bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("JWT Bearer token (declared for future auth wiring)")));
    // Intentionally no global addSecurityItem yet — add it once endpoints are actually
    // protected with authentication.
  }
}
