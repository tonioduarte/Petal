exports.up = function(knex) {
  return knex.schema
    .createTable('colecoes', (t) => {
      t.increments('id');
      t.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
      t.string('nome').notNullable();
      t.text('descricao').nullable();
      t.timestamps(true, true);
    })
    .createTable('colecao_fotos', (t) => {
      t.increments('id');
      t.integer('colecao_id').unsigned().notNullable().references('id').inTable('colecoes').onDelete('CASCADE');
      t.text('foto').notNullable(); // base64
      t.string('titulo').nullable();
      t.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('colecao_fotos').dropTableIfExists('colecoes');
};