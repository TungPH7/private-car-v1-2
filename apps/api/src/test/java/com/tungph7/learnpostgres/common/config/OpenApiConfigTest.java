package com.tungph7.learnpostgres.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import io.swagger.v3.oas.models.OpenAPI;

class OpenApiConfigTest {

  @Test
  void learnPostgresApi_names_no_fixed_server_so_swagger_ui_calls_the_host_it_is_opened_on() {
    // The api runs on its own host in each environment, behind Caddy of the VPS. springdoc
    // writes the server of the request when the document names none, so "Try it out" calls
    // the host the page came from.
    OpenAPI api = new OpenApiConfig().learnPostgresApi("learn-postgresql-api", "1.0.0");

    assertThat(api.getServers()).isNullOrEmpty();
  }

  @Test
  void learnPostgresApi_keeps_the_info_and_the_bearer_scheme() {
    OpenAPI api = new OpenApiConfig().learnPostgresApi("learn-postgresql-api", "1.0.0");

    assertThat(api.getInfo().getTitle()).isEqualTo("Learn PostgreSQL API");
    assertThat(api.getInfo().getVersion()).isEqualTo("1.0.0");
    assertThat(api.getComponents().getSecuritySchemes()).containsKey("bearerAuth");
  }
}
