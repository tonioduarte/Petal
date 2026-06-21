// migrations/..._create_posts.js
exports.up = function(knex) {
  return knex.schema.createTable('posts', (t) => {
    t.increments('id');
    t.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    t.text('legenda').nullable();
    t.text('imagem').nullable(); // base64
    t.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('posts');
};