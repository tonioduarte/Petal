exports.up = function (knex) {
  return knex.schema.table('usuarios', (table) => {
    table.text('atividades');
  });
};

exports.down = function (knex) {
  return knex.schema.table('usuarios', (table) => {
    table.dropColumn('atividades');
  });
};