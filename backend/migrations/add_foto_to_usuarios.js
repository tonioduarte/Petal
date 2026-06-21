exports.up = function (knex) {
  return knex.schema.table('usuarios', (table) => {
    table.text('foto');
  });
};

exports.down = function (knex) {
  return knex.schema.table('usuarios', (table) => {
    table.dropColumn('foto');
  });
};
