exports.up = function (knex) {
  return knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary();
    table.string('nome').notNullable();
    table.string('usuario').notNullable().unique(); // @user
    table.string('email').notNullable().unique();
    table.string('senha_hash').notNullable();
    table.string('tipo_artista');
    table.text('bio');
    table.string('localizacao');
    table.string('site');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('usuarios');
};