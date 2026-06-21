exports.up = function (knex) {
  return knex.schema.table('usuarios', (table) => {
    table.text('capa');
  });
};

exports.down = function (knex) {
  return knex.schema.table('usuarios', (table) => {
    table.dropColumn('capa');
  });
};